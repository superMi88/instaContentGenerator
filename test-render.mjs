import fs from 'fs/promises';
import path from 'path';
import sharp from 'sharp';
import { renderSlideToPng } from './src/lib/renderer.js'; // or test via route

console.log('Testing slide rendering pipeline...');
