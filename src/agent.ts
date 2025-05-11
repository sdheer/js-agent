import readline from "readline";
import * as dotenv from "dotenv";
import {
    GoogleGenerativeAI,
    FunctionDeclarationsTool,
    Part,
    SchemaType,
    ChatSession,
    HarmCategory,
    HarmBlockThreshold
} from "@google/generative-ai";

dotenv.config();

if (!process.env.GOOGLE_API_KEY) {
    console.error("CRITICAL: GOOGLE_API_KEY is not defined. Please check your .env file.");
    process.exit(1);
}

const genAI = new GoogleGenerativeAI(process.env.GOOGLE_API_KEY);

// --- Define Tools (Functions) for Gemini ---
const tools: FunctionDeclarationsTool[] = [
    {
        functionDeclarations: [
            {
                name: "check_appointment_availability",
                description: "Checks if a specific date and time is available for an appointment. Datetime should be in ISO 8601 format, UTC timezone.",
                parameters: {
                    type: SchemaType.OBJECT,
                    properties: {
                        datetime: {
                            type: SchemaType.STRING,
                            description: "The date and time in ISO 8601 format, UTC timezone (e.g., '2024-07-15T10:00:00Z').",
                        },
                    },
                    required: ["datetime"],
                },
            },
            {
                name: "schedule_appointment",
                description: "Schedules an appointment for a given date/time, name, and email. Datetime should be in ISO 8601 format, UTC timezone.",
                parameters: {
                    type: SchemaType.OBJECT,
                    properties: {
                        datetime: {
                            type: SchemaType.STRING,
                            description: "The date and time in ISO 8601 format, UTC timezone (e.g., '2024-07-15T10:00:00Z').",
                        },
                        name: {
                            type: SchemaType.STRING,
                            description: "Name of the person for the appointment.",
                        },
                        email: {
                            type: SchemaType.STRING,
                            description: "Email address of the person.",
                        },
                    },
                    required: ["datetime", "name", "email"],
                },
            },
            {
                name: "delete_appointment",
                description: "Deletes an appointment for a given date/time, name, and email. Datetime should be in ISO 8601 format, UTC timezone.",
                parameters: {
                    type: SchemaType.OBJECT,
                    properties: {
                        datetime: {
                            type: SchemaType.STRING,
                            description: "The date and time in ISO 8601 format, UTC timezone (e.g., '2024-07-15T10:00:00Z').",
                        },
                        name: {
                            type: SchemaType.STRING,
                            description: "Name of the person whose appointment is to be deleted.",
                        },
                        email: {
                            type: SchemaType.STRING,
                            description: "Email address of the person.",
                        },
                    },
                    required: ["datetime", "name", "email"],
                },
            },
        ],
    },
];

const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});

/**
 * Function to get the timezone
 * @param timeZone 
 * @returns 
 */
function getCurrentTimeInTimeZone(timeZone: string): string {
    return new Intl.DateTimeFormat("en-US", {
      timeZone,
      year: "numeric",
      month: "long",
      day: "numeric",
      hour: "numeric",
      minute: "numeric",
      second: "numeric",
      hour12: true, // For AM/PM format
    }).format(new Date());
  }

const SYSTEM_PROMPT_CONTENT = `
You are an appointment scheduler AI agent.
You have the ability to use tools to check availability, schedule, and delete appointments.
Chat with users who want to schedule an appointment with your owner.
Ask if they have any choice for the appointment time.
You must be able to understand that users might be from a different time zone.
Always use their timezone while chatting about times and dates to the user.
Before scheduling the appointment, you must ask for their name and email.
Your owner is in Kuala Lumpur timezone (UTC+08:00).
The current time and date for your owner is ${getCurrentTimeInTimeZone("Asia/Kuala_Lumpur")}.

Available tools/functions:
- check_appointment_availability: Checks if a datetime is available. Requires 'datetime' (ISO 8601 UTC).
- schedule_appointment: Schedules an appointment. Requires 'datetime' (ISO 8601 UTC), 'name', and 'email'.
- delete_appointment: Deletes an appointment. Requires 'datetime' (ISO 8601 UTC), 'name', and 'email'.

Always convert user-mentioned times to UTC ISO 8601 format before calling a function. For example, if the user says "tomorrow at 3 PM EST" and today is 2024-07-15, and EST is UTC-5, you should convert this to something like "2024-07-16T19:00:00Z" for the function call.
Be polite and helpful.
`;
/**
 * Placeholder for actual function implementations.
 * These functions are called by the agent when requested by the Gemini model.
 */

function check_appointment_availability(args: { datetime: string }): boolean { // This is one of your tool functions
    console.log(">>> Calling check_appointment_availability with:", args.datetime);
    // Actual implementation would check a calendar/database
    // For now, let's make it somewhat dynamic for testing
    if (new Date(args.datetime).getHours() < 9 || new Date(args.datetime).getHours() > 17) {
        console.log("<<< Appointment time is outside business hours (9 AM - 5 PM).");
        return false;
    }
    console.log("<<< Appointment slot is available.");
    return true;
}

function schedule_appointment(args: { datetime: string; name: string; email: string }): boolean {
    console.log(">>> Calling schedule_appointment for:", args.datetime, args.name, args.email);
    // Actual implementation would save to a calendar/database
    console.log("<<< Appointment scheduled successfully.");
    return true;
}

function delete_appointment(args: { datetime: string; name: string; email: string }): boolean {
    console.log(">>> Calling delete_appointment for:", args.datetime, args.name, args.email);
    // Actual implementation would delete from a calendar/database
    console.log("<<< Appointment deleted successfully.");
    return true;
}

// Type for the arguments object that functions will receive from Gemini
type FunctionArgs = { [key: string]: any };
type AgentFunction = (args: FunctionArgs) => boolean | string | Promise<boolean | string>;

const function_map: Record<string, AgentFunction> = {
    'check_appointment_availability': check_appointment_availability as AgentFunction,
    'schedule_appointment': schedule_appointment as AgentFunction,
    'delete_appointment': delete_appointment as AgentFunction,
};

/**
 * main function
 */
async function main(){
    console.log("Appointment Scheduler AI Agent (using Gemini)");
    console.log("Type 'quit' to exit.");

    const model = genAI.getGenerativeModel({
        model: "gemini-1.5-flash-latest",
        tools: tools,
        safetySettings: [ // Optional: Adjust safety settings as needed
            { category: HarmCategory.HARM_CATEGORY_HARASSMENT, threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE },
            { category: HarmCategory.HARM_CATEGORY_HATE_SPEECH, threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE },
            { category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT, threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE },
            { category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT, threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE },
        ],
    });

    const chat: ChatSession = model.startChat({
        history: [{ role: "user", parts: [{ text: SYSTEM_PROMPT_CONTENT }] }],
    });

    console.log("System: Hello! How can I help you schedule an appointment today?");

    while(true){
        const input: string = await new Promise((resolve)=>{
            rl.question("You: ", resolve);
        });

        if (input.toLowerCase() === 'quit') {
            console.log("System: Goodbye!");
            rl.close();
            break;
        }

        try {
            let result = await chat.sendMessage(input);
            let continueConversation = true;

            while(continueConversation) {
                const response = result.response;
                const functionCalls = response.functionCalls(); // This is an array

                if (functionCalls && functionCalls.length > 0) {
                    console.log(`System: (Thinking... received function call request for ${functionCalls.map(fc => fc.name).join(', ')})`);

                    const functionResponses: Part[] = [];

                    for (const call of functionCalls) {
                        const { name: functionName, args: functionArgs } = call;

                        if (function_map[functionName]) { // Check if the function exists in our map
                            try {
                                const funcToCall = function_map[functionName];
                                // Call the actual TypeScript function
                                const apiResponse = await Promise.resolve(funcToCall(functionArgs));
                                functionResponses.push({
                                    functionResponse: {
                                        name: functionName,
                                        response: { // Gemini expects the 'response' to be an object
                                            name: functionName, // Good practice to echo function name
                                            content: apiResponse, // The actual result
                                        },
                                    },
                                });
                            } catch (e: any) {
                                console.error(`Error executing function ${functionName}:`, e.message);
                                functionResponses.push({
                                    functionResponse: {
                                        name: functionName,
                                        response: { name: functionName, error: `Error executing function: ${e.message}` },
                                    },
                                });
                            }
                        } else {
                            console.error(`System: Error - Unknown function call: ${functionName}`);
                            functionResponses.push({
                                functionResponse: {
                                    name: functionName,
                                    response: { name: functionName, error: "Unknown function requested by the model." },
                                },
                            });
                        }
                    }
                    // Send all function responses back to the model
                    result = await chat.sendMessage(functionResponses);
                    // Loop again to see if the model responds with text or another function call
                } else {
                    // No function call, so this is a text response to the user
                    const textResponse = response.text();
                    console.log(`System: ${textResponse}`);
                    continueConversation = false; // Exit the inner loop, wait for next user input
                }
            }
        } catch (error: any) {
            console.error("System: An error occurred:", error.message || error);
        }
    }
}

main().catch(console.error);