import * as c from 'canvas';
import * as fs from "fs/promises";
import * as path from "path";
import colors from 'get-image-colors';

const log = console.log;
const IMAGE_SIZE_IN_COLLAGE = 40;

(async () => {
  const { default: chalk } = await import("chalk");
  
  function show(text: string) {
    log(chalk.blue(text));
  }

  const [, , inputImagePath, inputDirectory] = process.argv;

  show("Received:");
  show(
    `'${inputImagePath}' -> Image that will be recreated with the files from input directory`
  );
  show(`'${inputDirectory}' -> Directory with files that will make a collage`);

  show("Reading image input...");
  const img = await c.loadImage(inputImagePath);
  const { width, height } = img;
  if (!width || !height) throw new Error("Image dimensions not found");
  show(`Image input found, the image is: ${width}x${height}`);

  show("Reading input directory...");
  const files = await fs.readdir(inputDirectory);
  log(
    `${chalk.blue("Found")} ${chalk.red(files.length)} ${chalk.blue("files")}`
  );

  show("Starting to analyze files...");
  const images: {
    fileName: string;
    dominantColour: { r: number; g: number; b: number };
  }[] = [];
  for (const fileName of files) {
    if (!fileName.endsWith(".jpg") && !fileName.endsWith('.png')) continue;

    const pathToFile = path.join(inputDirectory, fileName);
    const dominant = (await colors(pathToFile))[0].rgb();

    images.push({ fileName: fileName, dominantColour: { r: dominant[0], g: dominant[1], b: dominant[2] } });
  }
  show('All files analyzed!');

  show('Loading input image into canvas...');
  const canvasInput = c.createCanvas(width, height);
  const ctxInput = canvasInput.getContext("2d");
  const inputImage = await c.loadImage(inputImagePath);

  ctxInput.drawImage(inputImage, 0, 0);
  show('Input image loaded!');

  show('Preparing output image...');
  const canvasOutput = c.createCanvas(
    width * IMAGE_SIZE_IN_COLLAGE,
    height * IMAGE_SIZE_IN_COLLAGE
  );
  const ctxOutput = canvasOutput.getContext("2d");

  console.log(`progress: 0/${width}`);
  for (let x = 0; x < width; x++) {
    for (let y = 0; y < height; y++) {
      const { data } = ctxInput.getImageData(x, y, 1, 1);
      const [r, g, b] = data;

      const imgs = images.sort(
        (a, second) =>
          - (
            Math.abs(a.dominantColour.r - r) +
            Math.abs(a.dominantColour.g - g) +
            Math.abs(a.dominantColour.b - b)
          ) +
          Math.abs(second.dominantColour.r - r) +
          Math.abs(second.dominantColour.g - g) +
          Math.abs(second.dominantColour.b - b)
      );
     
      const closest = imgs[imgs.length - 1];
      const {fileName} = closest;
      const image = await c.loadImage(path.join(inputDirectory, fileName));

      ctxOutput.drawImage(image, x * IMAGE_SIZE_IN_COLLAGE, y * IMAGE_SIZE_IN_COLLAGE, IMAGE_SIZE_IN_COLLAGE, IMAGE_SIZE_IN_COLLAGE);
    }
    console.log(`progress: ${x}/${width}`);
  }

  await fs.writeFile('./output.png', canvasOutput.createPNGStream());
  show('Everything ready!');
})();
