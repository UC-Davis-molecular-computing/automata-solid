#!/usr/bin/env node

/**
 * Build script to compile process_inputs.ts to a standalone JavaScript file
 * 
 * This creates a single bundled JS file that can be copied to the autograder_engine
 * to replace both the old Elm-compiled process_inputs.js and Dart process_inputs.dart
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

function main() {
  console.log('Building process_inputs.ts to standalone JavaScript...');
  
  try {
    // Use esbuild to bundle TypeScript into a single file
    console.log('Step 1: Bundling TypeScript with esbuild...');
    execSync('npx esbuild src/process_inputs.ts --bundle --platform=node --target=node16 --format=cjs --outfile=src/process_inputs.js --external:fs --external:path', {
      stdio: 'inherit',
      cwd: __dirname
    });
    
    const outputPath = path.join(__dirname, 'src', 'process_inputs.js');
    
    if (fs.existsSync(outputPath)) {
      // Make it executable
      fs.chmodSync(outputPath, '755');
      
      console.log('✅ Successfully built process_inputs.js');
      console.log(`📁 Output file: ${outputPath}`);
      console.log('\n📋 Next steps:');
      console.log('1. Test the compiled process_inputs.js');
      console.log('2. Copy src/process_inputs.js to the autograder_engine directory');
      console.log('3. Update run_autograder.py to use the unified processor');
      
    } else {
      throw new Error(`Compiled file not found at ${outputPath}`);
    }
    
  } catch (error) {
    console.error('❌ Build failed:', error.message);
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}