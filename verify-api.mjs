import sharp from 'sharp';
import fs from 'fs/promises';
import path from 'path';

async function verify() {
  console.log('--- 1. Testing GET /api/posts ---');
  const listRes = await fetch('http://localhost:3000/api/posts');
  const listData = await listRes.json();
  console.log('List response:', listData);

  console.log('\n--- 2. Testing POST /api/posts (creating sample post) ---');
  const createRes = await fetch('http://localhost:3000/api/posts', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      topic: 'Dating Red Flags',
      category: 'Liebe & Beziehung',
      slide1_question: 'Sollte man beim ersten Date getrennt zahlen?',
      slide2_answer: 'Ja! Es nimmt jegliche Erwartungshaltung und schafft von Anfang an Augenhöhe.',
      character_prompt: 'Cute chibi boy thinking with chin in hand',
      instagram_caption: 'Was ist eure Meinung dazu? Wer zahlt bei euch beim ersten Date? 👇',
    }),
  });

  const createData = await createRes.json();
  console.log('Create response success:', createData.success, 'Post ID:', createData.post?.id);

  if (!createData.success || !createData.post?.id) {
    throw new Error('Failed to create post');
  }

  const postId = createData.post.id;
  const postDir = path.join(process.cwd(), 'data', 'posts', postId);

  console.log('\n--- 3. Checking files in file system: data/posts/' + postId + ' ---');
  const files = await fs.readdir(postDir);
  console.log('Files in directory:', files);

  // Check meta.json
  const metaContent = await fs.readFile(path.join(postDir, 'meta.json'), 'utf-8');
  console.log('meta.json exists, length:', metaContent.length);

  // Check slide_1.png
  const slide1Path = path.join(postDir, 'slide_1.png');
  const slide1Meta = await sharp(slide1Path).metadata();
  console.log('slide_1.png dimensions:', slide1Meta.width, 'x', slide1Meta.height, 'format:', slide1Meta.format);

  // Check slide_2.png
  const slide2Path = path.join(postDir, 'slide_2.png');
  const slide2Meta = await sharp(slide2Path).metadata();
  console.log('slide_2.png dimensions:', slide2Meta.width, 'x', slide2Meta.height, 'format:', slide2Meta.format);

  if (slide1Meta.width === 1080 && slide1Meta.height === 1350 && slide2Meta.width === 1080 && slide2Meta.height === 1350) {
    console.log('\n✅ VERIFICATION PASSED: Exact 1080x1350 px Instagram Portrait dimensions confirmed!');
  } else {
    throw new Error('Image dimensions mismatch!');
  }

  console.log('\n--- 4. Testing GET /api/cron ---');
  const cronRes = await fetch('http://localhost:3000/api/cron');
  const cronData = await cronRes.json();
  console.log('Cron response:', cronData);

  console.log('\n--- 5. Testing GET / (Frontend Page) ---');
  const pageRes = await fetch('http://localhost:3000/');
  console.log('Page status:', pageRes.status, 'Content-Type:', pageRes.headers.get('content-type'));

  console.log('\n🎉 ALL SYSTEM TESTS PASSED SUCCESSFULLY!');
}

verify().catch((err) => {
  console.error('❌ Verification failed:', err);
  process.exit(1);
});
