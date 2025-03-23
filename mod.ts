import { parse as parsePath } from '@std/path';
import { parseSrt, serializeSrt } from '@remotion/captions';
import { isGoogleLanguage, translate } from './google-translate.ts';
import type { GoogleLanguage } from './languages.ts';
import { ProgressBar } from '@std/cli/unstable-progress-bar';

/**
 * Translate SRT file content to the target language using parallel processing
 * with a progress bar
 * @param content The content of the SRT file as a string
 * @param targetLang The target language code
 * @returns Translated SRT content
 */
async function translateSRT(content: string, targetLang: GoogleLanguage): Promise<string> {
  // Parse SRT using Remotion's parser
  const { captions } = parseSrt({ input: content });
  const totalEntries = captions.length;

  console.log(`Found ${totalEntries} subtitle entries to translate`);

  // Create a progress bar
  const progressBar = new ProgressBar(Deno.stdout.writable, {
    max: totalEntries,
    fmt(x) {
      return `${x.styledTime()}${x.progressBar}[${x.value}/${x.max} subtitles]`;
    },
  });

  // Create an array of translation promises
  const translationPromises = captions.map(async (caption) => {
    try {
      // Translate the text using the provided translate function
      const translatedText = await translate(caption.text, 'auto', targetLang);
      // Return a new caption object with translated text
      return {
        ...caption,
        text: translatedText,
      };
    } catch (error) {
      console.error(`\nError translating subtitle at ${caption.startMs}ms: ${error instanceof Error ? error.message : error}`);
      // Return the original caption if translation fails
      return caption;
    } finally {
      // Update progress bar
      progressBar.add(1);
    }
  });

  // Wait for all translations to complete
  const translatedCaptions = await Promise.all(translationPromises);

  // End the progress bar
  await progressBar.end();
  await Deno.stdout.write(new TextEncoder().encode('\n'));

  // Serialize back to SRT format using Remotion's serializer
  return serializeSrt({ lines: translatedCaptions.map((caption) => [caption]) });
}

/**
 * Main function to process an SRT file
 * @param inputPath Path to the input SRT file
 * @param targetLang Target language code
 * @param outputPath Optional path for the output file
 */
async function main() {
  // Parse command line arguments
  const args = Deno.args;

  if (args.length < 2) {
    console.error('Usage: deno run --allow-net --allow-read --allow-write jsr:@t1ckbase/srt-translator <input_file.srt> <target_language> [output_file.srt]');
    Deno.exit(1);
  }

  const inputPath = args[0];
  const targetLang = args[1];

  if (!isGoogleLanguage(targetLang)) {
    console.error(`Error: "${targetLang}" is not a valid Google Translate language code.`);
    console.error('Please use a valid language code (e.g., "en", "es", "fr", "ja", etc.)');
    Deno.exit(1);
  }

  // Generate output path if not provided
  let outputPath = args[2];
  if (!outputPath) {
    const parsedPath = parsePath(inputPath);
    outputPath = `${parsedPath.dir}/${parsedPath.name}.${targetLang}${parsedPath.ext}`;
  }

  try {
    // Read the input SRT file
    const content = await Deno.readTextFile(inputPath);

    console.log(`Translating subtitles from ${inputPath} to ${targetLang}...`);

    const startTime = performance.now();
    const translatedContent = await translateSRT(content, targetLang);
    const endTime = performance.now();

    // Calculate and display elapsed time
    const elapsedSeconds = ((endTime - startTime) / 1000).toFixed(2);

    // Write the translated content to the output file
    await Deno.writeTextFile(outputPath, translatedContent);

    console.log(`Translation complete in ${elapsedSeconds}s! Saved to ${outputPath}`);
  } catch (error) {
    console.error(`Error: ${error instanceof Error ? error.message : error}`);
    Deno.exit(1);
  }
}

// Run the main function
if (import.meta.main) {
  main();
}
