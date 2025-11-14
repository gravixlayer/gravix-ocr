import { type NextRequest, NextResponse } from "next/server"
import OpenAI from "openai"
import sharp from "sharp"

// Function to create OpenAI client with proper error handling
function createOpenAIClient() {
  const apiKey = process.env.GRAVIXLAYER_API_KEY
  
  if (!apiKey) {
    throw new Error("GRAVIXLAYER_API_KEY environment variable is required")
  }

  return new OpenAI({
    apiKey: apiKey,
    baseURL: "https://api.gravixlayer.com/v1",
  })
}

// Image processing function to enhance OCR accuracy
async function processImageForOCR(imageBuffer: Buffer): Promise<Buffer> {
  try {
    console.log("SERVER LOG: Starting image preprocessing for OCR optimization...")
    
    // Get image metadata
    const metadata = await sharp(imageBuffer).metadata()
    console.log(`SERVER LOG: Original image - Width: ${metadata.width}, Height: ${metadata.height}, Format: ${metadata.format}`)
    
    let processedImage = sharp(imageBuffer)
    
    // 1. Convert to grayscale for better text recognition
    processedImage = processedImage.grayscale()
    
    // 2. Enhance contrast and brightness
    processedImage = processedImage.normalize()
    
    // 3. Resize if image is too small (min 1000px on longest side for better OCR)
    if (metadata.width && metadata.height) {
      const maxDimension = Math.max(metadata.width, metadata.height)
      if (maxDimension < 1000) {
        const scaleFactor = 1000 / maxDimension
        processedImage = processedImage.resize({
          width: Math.round(metadata.width * scaleFactor),
          height: Math.round(metadata.height * scaleFactor),
          kernel: sharp.kernel.lanczos3
        })
        console.log(`SERVER LOG: Upscaled image by factor ${scaleFactor.toFixed(2)}`)
      }
    }
    
    // 4. Sharpen the image for better text clarity
    processedImage = processedImage.sharpen({
      sigma: 1,
      m1: 1,
      m2: 2,
      x1: 2,
      y2: 10,
      y3: 20
    })
    
    // 5. Apply gamma correction to improve contrast
    processedImage = processedImage.gamma(1.2)
    
    // 6. Convert to PNG for lossless quality
    const processedBuffer = await processedImage.png({ 
      quality: 100,
      compressionLevel: 0 
    }).toBuffer()
    
    console.log(`SERVER LOG: Image preprocessing completed. Original size: ${imageBuffer.length} bytes, Processed size: ${processedBuffer.length} bytes`)
    return processedBuffer
    
  } catch (error) {
    console.error("SERVER ERROR: Image processing failed:", error)
    console.log("SERVER LOG: Falling back to original image...")
    return imageBuffer
  }
}

export async function POST(request: NextRequest) {
  console.log("--- OCR API Route Started ---")
  try {
    // Log the API key being used (for debugging, remove in production)
    const gravixApiKey = process.env.GRAVIXLAYER_API_KEY
    if (!gravixApiKey) {
      console.error("SERVER ERROR: GRAVIXLAYER_API_KEY environment variable is NOT set.")
      return NextResponse.json({ error: "GRAVIXLAYER_API_KEY environment variable is not set" }, { status: 500 })
    } else {
      console.log(`SERVER LOG: GRAVIXLAYER_API_KEY is present. First 5 chars: ${gravixApiKey.substring(0, 5)}...`)
    }

    const formData = await request.formData()
    const image = formData.get("image") as File

    if (!image) {
      console.error("SERVER ERROR: No image file provided in request.")
      return NextResponse.json({ error: "No image file provided" }, { status: 400 })
    }

    console.log(`SERVER LOG: Received image file: ${image.name}, type: ${image.type}, size: ${image.size} bytes.`)

    // Convert image to buffer for processing
    const bytes = await image.arrayBuffer()
    const originalBuffer = Buffer.from(bytes)
    
    // Process the image to enhance OCR accuracy
    const processedBuffer = await processImageForOCR(originalBuffer)
    
    // Convert processed image to base64
    const base64Image = processedBuffer.toString("base64")
    const mimeType = "image/png" // Always PNG after processing
    const dataUrl = `data:${mimeType};base64,${base64Image}`
    console.log(`SERVER LOG: Processed image converted to base64. Data URL length: ${dataUrl.length} characters.`)

    console.log("SERVER LOG: Attempting to call Gravix Layer API with model gemma3:12b...")
    let completion: OpenAI.Chat.Completions.ChatCompletion

    try {
      // Create OpenAI client at runtime
      const openai = createOpenAIClient()
      
      completion = await openai.chat.completions.create({
        messages: [
          {
            role: "user",
            content: [
              {
                type: "text",
                text: 'Extract all the text from the image. Make sure to only return the extracted text and nothing else.',
              },
              {
                type: "image_url",
                image_url: {
                  url: dataUrl,
                },
              },
            ],
          },
        ],
        model: "google/gemma-3-12b-it",
        temperature: 0,
        max_tokens: 2048,
        top_p: 1,
        seed: 0,
        stream: false,
      })
      console.log("SERVER LOG: Successfully received response from Gravix Layer API.")
    } catch (apiCallError) {
      // This catch block specifically handles errors during the openai.chat.completions.create call
      console.error("SERVER ERROR: Error during Gravix Layer API call:", apiCallError)
      if (apiCallError instanceof OpenAI.APIError) {
        console.error("SERVER ERROR: OpenAI API Error details:", {
          status: apiCallError.status,
          code: apiCallError.code,
          type: apiCallError.type,
          message: apiCallError.message,
        })
        // Re-throw to be caught by the outer try-catch for consistent client response
        throw new Error(`Gravix Layer API error (${apiCallError.status || "unknown"}): ${apiCallError.message}`)
      } else if (apiCallError instanceof Error) {
        // Catch network errors or other generic errors from the SDK
        console.error("SERVER ERROR: Non-APIError during Gravix Layer call:", apiCallError.message, apiCallError.stack)
        throw new Error(`Network or SDK error during API call: ${apiCallError.message}`)
      } else {
        throw new Error("An unexpected error occurred during the API call.")
      }
    }

    // Ensure completion object and its properties are valid
    if (!completion || !completion.choices || completion.choices.length === 0 || !completion.choices[0].message) {
      console.error("SERVER ERROR: Unexpected completion structure from Gravix Layer.", completion)
      return NextResponse.json({ error: "Unexpected response structure from Gravix Layer API" }, { status: 500 })
    }

    const extractedText = completion.choices[0]?.message?.content || "No text could be extracted from the image"
    console.log("SERVER LOG: Extracted text (first 100 chars):", extractedText.substring(0, 100) + "...")

    console.log("--- OCR API Route Finished Successfully ---")
    return NextResponse.json({ text: extractedText })
  } catch (error) {
    // This outer catch block handles errors from file processing or re-thrown errors from the API call
    console.error("--- OCR API Route Failed ---")
    console.error("SERVER ERROR: Final catch block error:", error)

    if (error instanceof Error) {
      // Check for specific error messages to provide more accurate client responses
      if (error.message.includes("GRAVIXLAYER_API_KEY")) {
        return NextResponse.json({ error: "GRAVIXLAYER_API_KEY environment variable is not set" }, { status: 500 })
      }
      if (error.message.includes("Invalid API key")) {
        return NextResponse.json({ error: "Invalid API key" }, { status: 401 })
      }
      if (error.message.includes("Rate limit exceeded")) {
        return NextResponse.json({ error: "Rate limit exceeded" }, { status: 429 })
      }
      // Generic server error for other unhandled issues
      return NextResponse.json({ error: `Internal server error: ${error.message}` }, { status: 500 })
    }

    // Fallback for truly unknown error types
    return NextResponse.json({ error: "An unknown internal server error occurred." }, { status: 500 })
  }
}
