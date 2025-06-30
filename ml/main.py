# main.py
import os
import json
import uvicorn
import openai
from dotenv import load_dotenv
from fastapi import FastAPI, HTTPException, WebSocket, WebSocketDisconnect

from models import LoanApplicationRequest, LoanMatchResponse
from loan_matcher import loan_matcher

# --- 1. SETUP and CONFIGURATION ---

load_dotenv()
app = FastAPI(
    title="Loan Advisor Chatbot API",
    description="An API for finding lender matches using OpenAI Tool Calling.",
    version="1.2.1",  # Incrementing version for this change
)

try:
    openai_client = openai.AsyncClient(api_key=os.getenv("OPENAI_API_KEY"))
except TypeError:
    print("ERROR: OpenAI API key not found. Please create a .env file with your key.")
    openai_client = None

# --- 2. TOOL DEFINITION ---
tools = [
    {
        "type": "function",
        "function": {
            "name": "find_lenders",
            "description": "Get a list of suitable loan lenders based on the user's financial details. Call this only after you have collected all the required information.",
            "parameters": LoanApplicationRequest.model_json_schema(),
        },
    }
]

# The new system prompt guides the LLM to use the tool.
SYSTEM_PROMPT = """
You are LoanBot, a friendly and professional loan advisor.
Your primary goal is to collect the user's financial information by asking ONE question at a time.
The required information is: loan amount, annual income, employment status, credit score, and loan purpose.
Once you have all the necessary information, call the `find_lenders` tool.
Do not make up information for the tool. If any information is missing, ask the user for it first.
After the tool returns the lender information, present a friendly summary to the user.
"""


# --- 3. ORIGINAL REST API ENDPOINT (Unchanged) ---
@app.post("/find-lenders", response_model=LoanMatchResponse)
async def find_lenders_endpoint(application: LoanApplicationRequest):
    try:
        return loan_matcher.find_best_lenders(application)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"An unexpected error occurred: {str(e)}")


# --- 4. WEBSOCKET CHATBOT ENDPOINT (Updated for Tool Calling) ---


@app.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket):
    await websocket.accept()
    conversation_history = [{"role": "system", "content": SYSTEM_PROMPT}]

    try:
        while True:
            user_message = await websocket.receive_text()
            conversation_history.append({"role": "user", "content": user_message})

            response = await openai_client.chat.completions.create(
                model="gpt-4o",
                messages=conversation_history,
                tools=tools,
                tool_choice="auto",
            )
            response_message = response.choices[0].message
            conversation_history.append(response_message)

            if response_message.tool_calls:
                await handle_tool_calls(response_message.tool_calls, conversation_history, websocket)
            else:
                await send_chat_message(response_message.content, websocket)

    except WebSocketDisconnect:
        print("Client disconnected.")
    except Exception as e:
        print(f"An error occurred in websocket: {e}")
        await websocket.close(code=1011, reason="An internal error occurred.")


async def handle_tool_calls(tool_calls, history: list, websocket: WebSocket):
    """
    Processes tool calls, executes functions, and sends results back to the LLM and client.
    ORDER OF MESSAGES TO CLIENT IS REVERSED HERE.
    """
    for tool_call in tool_calls:
        function_name = tool_call.function.name

        if function_name == "find_lenders":
            print("LLM requested to call 'find_lenders' tool.")
            args = json.loads(tool_call.function.arguments)
            application = LoanApplicationRequest(**args)
            results = loan_matcher.find_best_lenders(application)

            # 1. Append the tool's result to the conversation history first
            # This is crucial so the LLM has context for the summary.
            history.append(
                {
                    "tool_call_id": tool_call.id,
                    "role": "tool",
                    "name": function_name,
                    "content": results.model_dump_json(),
                }
            )

            # 2. Make a second API call to get a natural language summary from the LLM
            print("Getting final summary from LLM...")
            summary_response = await openai_client.chat.completions.create(
                model="gpt-4o",
                messages=history,
            )
            summary_message = summary_response.choices[0].message.content

            # 3. Send the friendly summary to the UI as the first message
            await send_chat_message(summary_message, websocket)

            # 4. Then, send the structured lender data directly to the UI
            # The UI can use this to render cards immediately after the summary.
            await send_json_response("lenders", results.model_dump(), websocket)

            # Note: We don't break the loop here if we want further interaction.
            # If this is the end of the interaction, you might consider closing the websocket here.
            # For this example, the client will likely close itself or the session implicitly ends.


async def send_json_response(type: str, data: dict, websocket: WebSocket):
    """Sends a structured JSON message to the client."""
    await websocket.send_text(json.dumps({"type": type, "data": data}))


async def send_chat_message(message: str, websocket: WebSocket):
    """Sends a regular chat message to the client."""
    await send_json_response("chat", {"content": message}, websocket)


if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=8000)
