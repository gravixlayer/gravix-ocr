# GravixOCR

A Optical Character Recognition (OCR) application built with Next.js 14 and TypeScript, powered by Google's Gemma3:12b model via the Gravix Layer API.

## Overview

GravixOCR provides accurate text extraction from images through an intuitive web interface. The application features automatic image preprocessing and real-time text extraction.

## Core Features

- **Text Extraction**: Upload images and extract text using the Gemma3:12b AI model
- **Image Processing**: Automatic image optimization for improved OCR accuracy
- **Drag & Drop Upload**: Intuitive file upload with drag-and-drop support
- **Image Preview**: Automatic image resizing and preview display
- **Copy to Clipboard**: One-click text copying functionality
- **Processing Metrics**: Display of processing time and text statistics
- **Responsive Design**: Works on desktop and mobile devices

## Technical Stack

- **Framework**: Next.js 14 with App Router
- **Language**: TypeScript
- **Styling**: Tailwind CSS
- **UI Components**: Radix UI primitives with custom styling
- **Image Processing**: Sharp.js for server-side image optimization
- **AI Model**: Google Gemma3:12b via Gravix Layer API
- **Icons**: Lucide React

## Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/gravixlayer/GravixOCR.git
   cd GravixOCR
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Configure environment variables**
   
   Create a `.env.local` file in the root directory:
   ```env
   GRAVIXLAYER_API_KEY=your_gravix_layer_api_key_here
   ```

4. **Start the development server**
   ```bash
   npm run dev
   ```

5. **Open the application**
   
   Navigate to [http://localhost:3000](http://localhost:3000)

## Configuration

### Required Environment Variables

| Variable | Description | Required |
|----------|-------------|----------|
| `GRAVIXLAYER_API_KEY` | Your Gravix Layer API key for accessing Gemma3:12b | Yes |

### Supported Image Formats

- PNG
- JPG/JPEG  
- WebP
- Maximum file size: 10MB


## Usage

1. **Upload an Image**
   - Drag and drop an image file onto the upload area
   - Or click the upload area to browse and select a file

2. **View Results**
   - Text extraction begins automatically after upload
   - View processing time and extracted text
   - See character and word count statistics

3. **Copy Text**
   - Click the copy button to copy extracted text to clipboard
   - Visual feedback confirms successful copying

4. **Clear Results**
   - Click the X button to clear the current image and start over

## Project Structure

```
GravixOCR/
├── app/
│   ├── api/ocr/route.ts         # OCR API endpoint with image processing
│   ├── globals.css              # Global styles and Tailwind imports
│   ├── layout.tsx               # Root layout with theme provider
│   └── page.tsx                 # Main OCR interface
├── components/
│   ├── ui/                      # Reusable UI components (Button, Card, etc.)
│   ├── setup-guide.tsx          # API key setup instructions
│   └── theme-provider.tsx       # Dark theme configuration
├── lib/
│   └── utils.ts                 # Utility functions and class name helpers
└── public/
    └── Gravix Layer Logo.jpg    # Application logo
```

## Image Processing Pipeline

The application includes server-side image optimization for improved OCR accuracy:

1. **Grayscale Conversion**: Enhances text recognition
2. **Contrast Enhancement**: Normalizes image brightness and contrast  
3. **Resolution Optimization**: Upscales small images to minimum 1000px
4. **Sharpening**: Improves text clarity
5. **Format Standardization**: Converts to JPEG for consistent processing

## API Integration

The application integrates with the Gravix Layer API using the OpenAI-compatible interface:

- **Endpoint**: `https://api.gravixlayer.com/v1/inference`
- **Model**: `gemma3:12b`
- **Authentication**: API key via `GRAVIXLAYER_API_KEY`
- **Input**: Base64-encoded images with optimization prompt
- **Output**: Extracted text in JSON format

## License

This project is licensed under the MIT License.

## Support

- **Issues**: [GitHub Issues](https://github.com/gravixlayer/GravixOCR/issues)
- **Documentation**: [Gravix Layer Docs](https://docs.gravixlayer.com)
- **Website**: [gravixlayer.com](https://gravixlayer.com)

---

**Made by [Gravix Layer](https://gravixlayer.com) | Powered by Gemma3:12b**