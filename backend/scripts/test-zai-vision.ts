/**
 * Quick test to verify Z.ai GLM-5V-Turbo vision API is accessible.
 * Run: ZAI_API_KEY=your_key npx ts-node scripts/test-zai-vision.ts
 */

import { config } from '../src/config';

const API_URL = 'https://api.z.ai/api/paas/v4/chat/completions';

// Create a minimal 1x1 white JPEG as a test image
const TEST_IMAGE_BASE64 = '/9j/4AAQSkZJRgABAQEASABIAAD/2wBDAAgGBgcGBQgHBwcJCQgKDBQNDAsLDBkSEw8UHRofHh0aHBwgJC4nICIsIxwcKDcpLDAxNDQ0Hyc5PTgyPC4zNDL/2wBDAQkJCQwLDBgNDRgyIRwhMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjL/wAARCAABAAEDASIAAhEBAxEB/8QAHwAAAQUBAQEBAQEAAAAAAAAAAAECAwQFBgcICQoL/8QAFBABAAAAAAAAAAAAAAAAAAAACf/EABQRAQAAAAAAAAAAAAAAAAAAAAD/2gAMAwEAAhEDEQA/AKgA/9k=';

async function testZaiVision() {
  if (!config.zaiApiKey) {
    console.error('❌ ZAI_API_KEY is not set. Pass it via env: ZAI_API_KEY=xxx npx ts-node scripts/test-zai-vision.ts');
    process.exit(1);
  }

  console.log('Testing Z.ai GLM-5V-Turbo vision API...\n');

  const dataUrl = `data:image/jpeg;base64,${TEST_IMAGE_BASE64}`;

  try {
    const response = await fetch(API_URL, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${config.zaiApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'glm-5v-turbo',
        messages: [
          {
            role: 'user',
            content: [
              { type: 'image_url', image_url: { url: dataUrl } },
              { type: 'text', text: 'What do you see in this image? Reply with a short description.' },
            ],
          },
        ],
        max_tokens: 200,
      }),
    });

    console.log(`Status: ${response.status} ${response.statusText}`);

    if (!response.ok) {
      const err = await response.text();
      console.error('Error response:', err);
      process.exit(1);
    }

    const result = await response.json() as any;
    console.log('\nModel:', result.model);
    console.log('Response:', result.choices?.[0]?.message?.content);
    console.log('\n✅ Z.ai GLM-5V-Turbo API is working!');
  } catch (err: any) {
    console.error('❌ API test failed:', err.message);
    process.exit(1);
  }
}

testZaiVision();
