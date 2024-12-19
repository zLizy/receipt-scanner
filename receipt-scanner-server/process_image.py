import torch
from transformers import AutoProcessor, AutoModelForCausalLM
from PIL import Image
import sys
import json

import base64
import requests
from together import Together
from dotenv import load_dotenv
import os

# Load environment variables from .env file
load_dotenv()

def ocr(file_path, language, country, api_key=None, model="Llama-3.2-90B-Vision"):
    # Get the API key from environment if not provided
    if api_key is None:
        api_key = os.getenv("TOGETHER_API_KEY")
    
    vision_llm = "meta-llama/Llama-Vision-Free" if model == "free" else f"meta-llama/{model}-Instruct-Turbo"
    client = Together(api_key=api_key)
    final_markdown = get_json(client, vision_llm, file_path, language, country)
    return final_markdown

def get_json(client, vision_llm, file_path, language, country):
    system_prompt = f"""Extract the following information from the provided image and format it as JSON suitable for a PostgreSQL database:
    (A user has some settings in terms of language: {language} and country: {country}. Use this information as an indicator/suggestion to identify the content of the receipt.)
    - date: The date of the transaction in the format 'YYYY-MM-DD'.
    - items: A JSON array of items purchased, each with 'name', 'quantity', and 'price', and 'subcategory' (e.g., food, drink, furniture, etc.). If the subcategory is not known, set it to 'Unknown'. (Note, sometimes the items are in capital letters, so make sure to lowercase them)
    - total: The total amount spent as a number.
    - place: The name of the merchant or place of transaction.
    - category: The category of the transaction (e.g. 'Groceries', 'Restaurant', 'Shopping', etc.). Make it capitalize the first letter of each word. Think of the categories that are necessary for the app to function.
    Below are some example categories and subcategories:
    1. Groceries
        Subcategories:
        Produce (e.g., apples, bananas)
        Dairy (e.g., milk, cheese)
        Meat (e.g., chicken, beef)
        Bakery (e.g., bread, pastries)
        Beverages (e.g., juice, soda)
        Fruit (e.g., apples, bananas)
    2. Restaurant
        Subcategories:
        Brunch (e.g., sunny eggs, pancakes)
        Fine Dining (e.g., steak, seafood)
        Casual Dining (e.g., pasta, pizza)
        Cafes (e.g., coffee, pastries)
        Beverages (e.g., juice, soda)
    3. Shopping
        Subcategories:
        Clothing (e.g., shirts, pants)
        Electronics (e.g., phones, laptops)
        Home Goods (e.g., forks, spoons)
        Beauty (e.g., makeup, skincare)
    4. Alcohol
        Subcategories:
        Wine (e.g., red wine, white wine)
        Beer (e.g., beer case, craft beer)
        Spirits (e.g., whiskey, vodka)
    5. Furniture
        Subcategories:
        Living Room (e.g., sofa, coffee table)
        Bedroom (e.g., bed, dresser)
        Dining Room (e.g., dining table, chairs)
        Office (e.g., desk, office chair)
    6. Entertainment
        Subcategories:
        Movies (e.g., cinema tickets)
        Concerts (e.g., concert tickets)
        Games (e.g., video games, board games)
    7.Travel
        Subcategories:
        Flights (e.g., airline tickets)
        Hotels (e.g., hotel bookings)
        Car Rentals (e.g., rental cars)
    These categories and subcategories are only examples, you can add more categories and subcategories as needed.
    The (sub)category name shall be capitalized.

    Output the information in the following JSON format:
    {
      "date": "YYYY-MM-DD",
      "items": [{"name": "item_name", "quantity": number, "price": number, "subcategory": "subcategory_name"}],
      "total": number,
      "place": "merchant_name",
      "category": "category_name"
    }
    Output format: only output JSON.
    """

    final_image_url = file_path if is_remote_file(file_path) else f"data:image/jpeg;base64,{encode_image(file_path)}"

    response = client.chat.completions.create(
        model=vision_llm,
        messages=[
            {
                "role": "user",
                "content": [
                    {"type": "text", "text": system_prompt},
                    {"type": "image_url", "image_url": {"url": final_image_url}}
                ]
            }
        ],
        max_tokens=1024,
        temperature=0.9,
        top_p=0.7,
        top_k=50,
        repetition_penalty=1,
        stop=["<|eot_id|>", "<|eom_id|>"],
        stream=True
    )
    # print('Successfully received response')

    _content = ""
    for token in response:
        if hasattr(token, 'choices'):
            if token.choices:
                piece = token.choices[0].delta.content
                # print(f'piece: {piece}')
                _content += piece

    # print(f'content: {_content}')

    # Parse the JSON output
    try:
        # Extract JSON content from the response
        # print(f'_content: {_content}')
        if '```json' in _content:
            json_start = _content.find('```json')
            json_start = json_start + 7
        else:
            json_start = _content.find('```')
            json_start = json_start + 3
        json_end = _content.rfind('```') + 1
        json_content = _content[json_start:json_end-1]
        # print(f'json_content: {json_content}\n')
        
        parsed_data = json.loads(json_content)
    except json.JSONDecodeError:
        raise ValueError("Failed to parse the output as JSON.")
    
    # Ensure the parsed data matches the expected format
    if not all(key in parsed_data for key in ["date", "items", "total", "place","category"]):
        raise ValueError("Parsed data does not contain all required fields.")
    
    return parsed_data

def encode_image(image_path):
    with open(image_path, "rb") as image_file:
        return base64.b64encode(image_file.read()).decode('utf-8')

def is_remote_file(file_path):
    return file_path.startswith("http://") or file_path.startswith("https://")
    

def process_image(image_path):
    model = AutoModelForCausalLM.from_pretrained(
        "AIDC-AI/Ovis1.6-Llama3.2-3B",
        torch_dtype=torch.bfloat16,
        multimodal_max_length=8192,
        trust_remote_code=True
    ).cuda()
    
    text_tokenizer = model.get_text_tokenizer()
    visual_tokenizer = model.get_visual_tokenizer()

    image = Image.open(image_path)
    prompt = (
        "Extract the following information from the provided image and format it as JSON:\n"
        "- date: The date of the transaction.\n"
        "- items: A list of items purchased, including quantity and price.\n"
        "- total: The total amount of the transaction.\n"
        "- place: The name of the merchant or place of transaction.\n\n"
        "Output the information in the following JSON format:\n"
        "{\n"
        "  \"date\": \"YYYY-MM-DD\",\n"
        "  \"items\": [{\"name\": \"item_name\", \"quantity\": number, \"price\": number}],\n"
        "  \"total\": number,\n"
        "  \"place\": \"merchant_name\"\n"
        "}\n"
    )
    
    # query = f'<image>\n{prompt}'
    query = f'{prompt}'
    prompt, input_ids, pixel_values = model.preprocess_inputs(query, [image])
    attention_mask = torch.ne(input_ids, text_tokenizer.pad_token_id)
    input_ids = input_ids.unsqueeze(0).to(device=model.device)
    attention_mask = attention_mask.unsqueeze(0).to(device=model.device)
    pixel_values = [pixel_values.to(dtype=visual_tokenizer.dtype, device=visual_tokenizer.device)]

    with torch.inference_mode():
        gen_kwargs = dict(
            max_new_tokens=1024,
            do_sample=False,
            top_p=None,
            top_k=None,
            temperature=None,
            repetition_penalty=None,
            eos_token_id=model.generation_config.eos_token_id,
            pad_token_id=text_tokenizer.pad_token_id,
            use_cache=True
        )
        output_ids = model.generate(input_ids, pixel_values=pixel_values, attention_mask=attention_mask, **gen_kwargs)[0]
        markdown_data = text_tokenizer.decode(output_ids, skip_special_tokens=True)

    # Parse the JSON output
    try:
        # Extract JSON content from the response
        json_start = markdown_data.find('{')
        json_end = markdown_data.rfind('}') + 1
        json_content = markdown_data[json_start:json_end]
        
        parsed_data = json.loads(json_content)
    except json.JSONDecodeError:
        raise ValueError("Failed to parse the output as JSON.")
    
    # Ensure the parsed data matches the expected format
    if not all(key in parsed_data for key in ["date", "items", "total", "place"]):
        raise ValueError("Parsed data does not contain all required fields.")
    
    return parsed_data

if __name__ == "__main__":
    image_path = sys.argv[1]
    # print(image_path)
    # markdown_data = process_image(image_path)
    # print(json.dumps({"generated_text": markdown_data}))
    parsed_data = ocr(image_path)
    print(json.dumps(parsed_data, indent=2))
    # print(json.dumps({"generated_text": markdown_data}))