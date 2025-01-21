import chalk from "chalk";
import { Command } from "commander";
import inquirer from "inquirer";
import fs from "fs";
import path from "path";
import Connector, { Finetune, FluxDev1, FluxPro1, FluxPro11, FluxPro11Finetuned, FluxPro1Finetuned } from "@conducolabs/bfl-js";
import cliProgress from "cli-progress";
import axios from "axios";

const initCommand = (program: Command) => {
    program
        .command("generate-image")
        .option("-k, --apiKey <string>", "API key for the BFL API.")
        .option("-p, --prompt <string>", "Prompt for the image generation")
        .option("-m, --model <string>", "Model to use for the image generation")
        .option("-o, --output <string>", "Output location for the image")
        .option("-c, --configurationFile <string>", "Configuration file for the image generation (optional)")
        .option("-f, --finetune <string>", "Finetune ID for the image generation (optional). Insert 'select' to select an existing finetune model.")
        .option("-t --tool <string>", "Tool to be used for the image generation  (optional)")
        .option("--mask <string>", "Path to a mask for the image generation (to be used with the fill tool)")
        .option("--image <string>", "Path to an image for the image generation (to be used with the fill tool)")
        .option("--controlImage <string>", "Path to an control image for the image generation (to be used with the canny or depth tool)")
        .option("--preprocessedImage <string>", "Path to an preprocessed image for the image generation (to be used with the canny or depth tool)")
        .action(async (options) => {
            if (!options.apiKey) {
                console.log(chalk.red("⨯ API key is required."));
                return;
            }

            if (!options.prompt) {
                console.log(chalk.red("⨯ Prompt is required."));
                return;
            }

            const models = ["flux-dev", "flux-pro", "flux-pro 1.1"];
            const fluxPro1Modes = ["none", "fill", "canny", "depth"];
            const fluxPro11Modes = ["none", "ultra"];

            let model = "";
            let mode = "none"
            const useFinetune = options.finetune ? true : false;

            let configuration = {};

            if (!options.model || !models.includes(options.model)) {
                try {
                    const input = await inquirer.prompt([{
                        type: "list",
                        name: "model",
                        message: "Select an image generation model:",
                        choices: models
                    }]);
                    model = input.model;
                } catch(error) {
                    return;
                }
            } else {
                model = options.model;
                console.log(chalk.green("✓"), `Model is set to "${ options.model }".`);
            }

            if (!options.mode) {
                if (model === "flux-pro") {
                    try {
                        const input = await inquirer.prompt([{
                            type: "list",
                            name: "mode",
                            message: "Select if a tool should be used for image generation:",
                            choices: fluxPro1Modes
                        }]);
                        mode = input.mode;
                    } catch(error) {
                        return;
                    }
                } else if (model === "flux-pro 1.1") {
                    try {
                        const input = await inquirer.prompt([{
                            type: "list",
                            name: "mode",
                            message: "Select if a tool should be used for image generation:",
                            choices: fluxPro11Modes
                        }]);
                        mode = input.mode;
                    } catch(error) {
                        return;
                    }
                }
            } else {
                if (model === "flux-pro" && fluxPro1Modes.includes(options.mode)) {
                    mode = options.mode;
                    console.log(chalk.green("✓"), `Tool is set to "${ options.mode }".`);
                } else if (model === "flux-pro 1.1" && fluxPro11Modes.includes(options.mode)) {
                    mode = options.mode;
                    console.log(chalk.green("✓"), `Tool is set to "${ options.mode }".`);
                }
            }

            if (!options.output) {
                console.log(chalk.red("⨯ Output location is required."));
                return;
            }

            if (!fs.existsSync(path.resolve(options.output))) {
                try {
                    console.log(path.resolve(options.output));
                    fs.mkdirSync(path.resolve(options.output), { recursive: true });
                    console.log(chalk.green("✓"), "Output location created.");
                } catch(error) {
                    console.log(chalk.red("⨯ Could not create output location."));
                    return;
                }
                return;
            } else {
                console.log(chalk.green("✓"), "Output location exists.");
            }

            if (options.configurationFile) {
                if (!fs.existsSync(path.resolve(options.configurationFile))) {
                    console.log(chalk.red("⨯ Configuration file does not exist."));
                    return;
                } else {
                    try{
                        configuration = JSON.parse(fs.readFileSync(path.resolve(options.configurationFile)).toString());
                        console.log(chalk.green("✓"), "Configuration file loaded.");
                    } catch(error) {
                        console.log(chalk.red("⨯ Could not parse configuration file."));
                        return;
                    }
                }
            }

            const bflApi = new Connector({ apiKey: options.apiKey });

            switch (model) {
                case "flux-dev":
                    const fluxDev1 = new FluxDev1(bflApi);
                    try {
                        const image = await fluxDev1.generateImage(options.prompt, configuration);
                        console.log(chalk.green("✓"), "Image generation in progress...");
                        const statusBar = new cliProgress.SingleBar({}, cliProgress.Presets.shades_classic);
                        statusBar.start(100, 0);
                        await fetchImageDetails(bflApi, image.id, statusBar, downloadImage, options.output);
                    } catch(error:any) {
                        console.log(chalk.red("⨯ Could not generate image.", error.message));
                    }
                    break;
                case "flux-pro":
                    try {
                        if (useFinetune) {
                            const fluxPro1Finetuned = new FluxPro1Finetuned(bflApi);

                            let finetuneId = options.finetune;
                            if (finetuneId === "select") {
                                finetuneId = await selectExistingFinetuneModel(bflApi);
                            }

                            if (mode === "fill") {
                                let maskImagePath = "";
                                let preImagePath = "";
                                if (!options.controlImage) {
                                    const input = await inquirer.prompt([{
                                        type: "input",
                                        name: "maskImage",
                                        message: "Please provide the path to a mask image:"
                                    }]);
                                    maskImagePath = input.maskImage;
                                }
                                if (!fs.existsSync(path.resolve(maskImagePath))) {
                                    console.log(chalk.red("⨯ Control image does not exist."));
                                    return;
                                }
                                if (!options.image) {
                                    const input = await inquirer.prompt([{
                                        type: "input",
                                        name: "image",
                                        message: "Please provide the path to a base image:"
                                    }]);
                                    preImagePath = input.image;
                                }
                                if (!fs.existsSync(path.resolve(preImagePath))) {
                                    console.log(chalk.red("⨯ Image does not exist."));
                                    return;
                                }
                                const maskImage = loadImageToBase64(path.resolve(maskImagePath));
                                const preImage = loadImageToBase64(path.resolve(preImagePath));
                                const image = await fluxPro1Finetuned.generateImageWithMask(options.prompt, finetuneId, {
                                    ...configuration,
                                    mask: maskImage,
                                    image: preImage
                                });
                                console.log(chalk.green("✓"), "Image generation in progress...");
                                const statusBar = new cliProgress.SingleBar({}, cliProgress.Presets.shades_classic);
                                statusBar.start(100, 0);
                                await fetchImageDetails(bflApi, image.id, statusBar, downloadImage, options.output);
                            } else if (mode === "canny") {
                                let controlImagePath = "";
                                if (!options.controlImage) {
                                    const input = await inquirer.prompt([{
                                        type: "input",
                                        name: "controlImage",
                                        message: "Please provide the path to a control image:"
                                    }]);
                                    controlImagePath = input.controlImage;
                                }
                                if (!fs.existsSync(path.resolve(controlImagePath))) {
                                    console.log(chalk.red("⨯ Control image does not exist."));
                                    return;
                                }
                                const controlImage = loadImageToBase64(path.resolve(controlImagePath));
                                const image = await fluxPro1Finetuned.generateCannyImageWithControlImage(options.prompt, finetuneId, {
                                    ...configuration,
                                    control_image: controlImage
                                });
                                console.log(chalk.green("✓"), "Image generation in progress...");
                                const statusBar = new cliProgress.SingleBar({}, cliProgress.Presets.shades_classic);
                                statusBar.start(100, 0);
                                await fetchImageDetails(bflApi, image.id, statusBar, downloadImage, options.output);
                            } else if (mode === "depth") {
                                let controlImagePath = "";
                                if (!options.controlImage) {
                                    const input = await inquirer.prompt([{
                                        type: "input",
                                        name: "controlImage",
                                        message: "Please provide the path to a control image:"
                                    }]);
                                    controlImagePath = input.controlImage;
                                }
                                if (!fs.existsSync(path.resolve(controlImagePath))) {
                                    console.log(chalk.red("⨯ Control image does not exist."));
                                    return;
                                }
                                const controlImage = loadImageToBase64(path.resolve(controlImagePath));
                                const image = await fluxPro1Finetuned.generateDepthImageWithControlImage(options.prompt, finetuneId, {
                                    ...configuration,
                                    control_image: controlImage
                                });
                                console.log(chalk.green("✓"), "Image generation in progress...");
                                const statusBar = new cliProgress.SingleBar({}, cliProgress.Presets.shades_classic);
                                statusBar.start(100, 0);
                                await fetchImageDetails(bflApi, image.id, statusBar, downloadImage, options.output);
                            } else {
                                const image = await fluxPro1Finetuned.generateImage(options.prompt, finetuneId, configuration);
                                console.log(chalk.green("✓"), "Image generation in progress...");
                                const statusBar = new cliProgress.SingleBar({}, cliProgress.Presets.shades_classic);
                                statusBar.start(100, 0);
                                await fetchImageDetails(bflApi, image.id, statusBar, downloadImage, options.output);
                            }
                        } else {
                            const fluxPro1 = new FluxPro1(bflApi);
                            if (mode === "fill") {
                                let maskImagePath = "";
                                let preImagePath= "";
                                if (!options.controlImage) {
                                    const input = await inquirer.prompt([{
                                        type: "input",
                                        name: "maskImage",
                                        message: "Please provide the path to a mask image:"
                                    }]);
                                    maskImagePath = input.maskImage;
                                }
                                if (!fs.existsSync(path.resolve(maskImagePath))) {
                                    console.log(chalk.red("⨯ Control image does not exist."));
                                    return;
                                }
                                if (!options.image) {
                                    const input = await inquirer.prompt([{
                                        type: "input",
                                        name: "image",
                                        message: "Please provide the path to a base image:"
                                    }]);
                                    preImagePath = input.image;
                                }
                                if (!fs.existsSync(path.resolve(preImagePath))) {
                                    console.log(chalk.red("⨯ Image does not exist."));
                                    return;
                                }
                                const maskImage = loadImageToBase64(path.resolve(maskImagePath));
                                const preImage = loadImageToBase64(path.resolve(preImagePath));
                                const image = await fluxPro1.generateImageWithMask(options.prompt, {
                                    ...configuration,
                                    mask: maskImage,
                                    image: preImage
                                });
                                console.log(chalk.green("✓"), "Image generation in progress...");
                                const statusBar = new cliProgress.SingleBar({}, cliProgress.Presets.shades_classic);
                                statusBar.start(100, 0);
                                await fetchImageDetails(bflApi, image.id, statusBar, downloadImage, options.output);
                            } else if (mode === "canny") {
                                let controlImagePath = "";
                                let preprocessedImagePath = "";
                                if (!options.controlImage) {
                                    const input = await inquirer.prompt([{
                                        type: "input",
                                        name: "controlImage",
                                        message: "Please provide the path to a control image:"
                                    }]);
                                    controlImagePath = input.controlImage;
                                }
                                if (!fs.existsSync(path.resolve(controlImagePath))) {
                                    console.log(chalk.red("⨯ Control image does not exist."));
                                    return;
                                }
                                const controlImage = loadImageToBase64(path.resolve(controlImagePath));
                                if (!options.preprocessedImage) {
                                    const input = await inquirer.prompt([{
                                        type: "input",
                                        name: "preprocessedImage",
                                        message: "Please provide the path to a preprocessed image. If you don't want to use a preprocessed image, just hit ENTER:"
                                    }]);
                                    preprocessedImagePath = input.preprocessedImage;
                                }

                                if (preprocessedImagePath !== "") {
                                    if (!fs.existsSync(path.resolve(preprocessedImagePath))) {
                                        console.log(chalk.red("⨯ Preprocessed image does not exist."));
                                        return;
                                    }
                                    const preprocessedImage = loadImageToBase64(path.resolve(preprocessedImagePath));
                                    const image = await fluxPro1.generateCannyImageWithControlImage(options.prompt, {
                                        ...configuration,
                                        control_image: controlImage,
                                        preprocessed_image: preprocessedImage
                                    });
                                    console.log(chalk.green("✓"), "Image generation in progress...");
                                    const statusBar = new cliProgress.SingleBar({}, cliProgress.Presets.shades_classic);
                                    statusBar.start(100, 0);
                                    await fetchImageDetails(bflApi, image.id, statusBar, downloadImage, options.output);
                                } else {
                                    const image = await fluxPro1.generateCannyImageWithControlImage(options.prompt, {
                                        ...configuration,
                                        control_image: controlImage
                                    });
                                    console.log(chalk.green("✓"), "Image generation in progress...");
                                    const statusBar = new cliProgress.SingleBar({}, cliProgress.Presets.shades_classic);
                                    statusBar.start(100, 0);
                                    await fetchImageDetails(bflApi, image.id, statusBar, downloadImage, options.output);
                                }
                            } else if (mode === "depth") {
                                let controlImagePath = "";
                                let preprocessedImagePath = "";
                                if (!options.controlImage) {
                                    const input = await inquirer.prompt([{
                                        type: "input",
                                        name: "controlImage",
                                        message: "Please provide the path to a control image:"
                                    }]);
                                    controlImagePath = input.controlImage;
                                }
                                if (!fs.existsSync(path.resolve(controlImagePath))) {
                                    console.log(chalk.red("⨯ Control image does not exist."));
                                    return;
                                }
                                const controlImage = loadImageToBase64(path.resolve(controlImagePath));
                                if (!options.preprocessedImage) {
                                    const input = await inquirer.prompt([{
                                        type: "input",
                                        name: "preprocessedImage",
                                        message: "Please provide the path to a preprocessed image. If you don't want to use a preprocessed image, just hit ENTER:"
                                    }]);
                                    preprocessedImagePath = input.preprocessedImage;
                                }

                                if (preprocessedImagePath !== "") {
                                    if (!fs.existsSync(path.resolve(preprocessedImagePath))) {
                                        console.log(chalk.red("⨯ Preprocessed image does not exist."));
                                        return;
                                    }
                                    const preprocessedImage = loadImageToBase64(path.resolve(preprocessedImagePath));
                                    const image = await fluxPro1.generateDepthImageWithControlImage(options.prompt, {
                                        ...configuration,
                                        control_image: controlImage,
                                        preprocessed_image: preprocessedImage
                                    });
                                    console.log(chalk.green("✓"), "Image generation in progress...");
                                    const statusBar = new cliProgress.SingleBar({}, cliProgress.Presets.shades_classic);
                                    statusBar.start(100, 0);
                                    await fetchImageDetails(bflApi, image.id, statusBar, downloadImage, options.output);
                                } else {
                                    const image = await fluxPro1.generateDepthImageWithControlImage(options.prompt, {
                                        ...configuration,
                                        control_image: controlImage
                                    });
                                    console.log(chalk.green("✓"), "Image generation in progress...");
                                    const statusBar = new cliProgress.SingleBar({}, cliProgress.Presets.shades_classic);
                                    statusBar.start(100, 0);
                                    await fetchImageDetails(bflApi, image.id, statusBar, downloadImage, options.output);
                                }
                            } else {
                                const image = await fluxPro1.generateImage(options.prompt, configuration);
                                console.log(chalk.green("✓"), "Image generation in progress...");
                                const statusBar = new cliProgress.SingleBar({}, cliProgress.Presets.shades_classic);
                                statusBar.start(100, 0);
                                await fetchImageDetails(bflApi, image.id, statusBar, downloadImage, options.output);
                            }
                        }
                    } catch(error:any) {
                        console.log(chalk.red("⨯ Could not generate image.", error.message));
                        return;
                    }
                    break;
                case "flux-pro 1.1":
                    try {
                        if (useFinetune) {
                            const fluxPro11Finetuned = new FluxPro11Finetuned(bflApi);

                            let finetuneId = options.finetune;
                            if (finetuneId === "select") {
                                finetuneId = await selectExistingFinetuneModel(bflApi);
                            }

                            if (mode === "ultra") {
                                const image = await fluxPro11Finetuned.generateUltraImage(options.prompt, finetuneId, configuration);
                                console.log(chalk.green("✓"), "Image generation in progress...");
                                const statusBar = new cliProgress.SingleBar({}, cliProgress.Presets.shades_classic);
                                statusBar.start(100, 0);
                                await fetchImageDetails(bflApi, image.id, statusBar, downloadImage, options.output);
                            } else {
                                const image = await fluxPro11Finetuned.generateImage(options.prompt, finetuneId, configuration);
                                console.log(chalk.green("✓"), "Image generation in progress...");
                                const statusBar = new cliProgress.SingleBar({}, cliProgress.Presets.shades_classic);
                                statusBar.start(100, 0);
                                await fetchImageDetails(bflApi, image.id, statusBar, downloadImage, options.output);
                            }
                        } else {
                            const fluxPro11 = new FluxPro11(bflApi);
                            if (mode === "ultra") {
                                const image = await fluxPro11.generateUltraImage(options.prompt, configuration);
                                console.log(chalk.green("✓"), "Image generation in progress...");
                                const statusBar = new cliProgress.SingleBar({}, cliProgress.Presets.shades_classic);
                                statusBar.start(100, 0);
                                await fetchImageDetails(bflApi, image.id, statusBar, downloadImage, options.output);
                            } else {
                                const image = await fluxPro11.generateImage(options.prompt, configuration);
                                console.log(chalk.green("✓"), "Image generation in progress...");
                                const statusBar = new cliProgress.SingleBar({}, cliProgress.Presets.shades_classic);
                                statusBar.start(100, 0);
                                await fetchImageDetails(bflApi, image.id, statusBar, downloadImage, options.output);
                            }
                        }
                    } catch(error:any) {
                        console.log(chalk.red("⨯ Could not generate image.", error));
                        return;
                    }
                    break;
            }
        });
};

const fetchImageDetails = async (bflApi: Connector, imageId: string, statusBar: any, downloadFunction: any, output: string) => {
    const status = await bflApi.getStatus(imageId);
    if (status.status === "Ready") {
        statusBar.update(100);
        statusBar.stop();
        await downloadFunction(imageId, status.result.sample, output);
    } else {
        statusBar.update(status.progress * 100);
        setTimeout(async () => {
            await fetchImageDetails(bflApi, imageId, statusBar, downloadFunction, output);
        }, 1000);
    }
}

const downloadImage = async (id: string, url: string, location: string) => {
    console.log(chalk.green("✓"), "Image generation done. Downloading file...");
    const statusBar = new cliProgress.SingleBar({}, cliProgress.Presets.shades_classic);
    statusBar.start(100, 0);
    const response = await axios.get(url, { 
        responseType: "arraybuffer",
        onDownloadProgress: (progressEvent: any) => {
            let percentCompleted = Math.round((progressEvent.loaded * 100) / progressEvent.total);
            if (percentCompleted === 100) {
                statusBar.update(100);
                statusBar.stop();
            } else {
                statusBar.update(percentCompleted);
            }
        }
    });
    const fileData = Buffer.from(response.data, "binary");
    let extension = "jpeg";
    if (response.headers["content-type"] === "image/png") {
        extension = "png";
    }
    fs.writeFileSync(path.resolve(`${ location }/${ id }.${ extension }`), fileData);
    setTimeout(() => { 
        console.log(chalk.green(`✓ Download finished. File saved at ${ location }/${ id }.${ extension }`));
        process.exit(0);
    }, 1000);
}

const loadImageToBase64 = (path: string) => {
    return fs.readFileSync(path, { encoding: "base64" });
};

const selectExistingFinetuneModel = async (bflApi: Connector) => {
    const finetuningApi = new Finetune(bflApi);
    const finetuningIds = await finetuningApi.getList();

    const finetunes = [];

    for (const finetune of finetuningIds.finetunes) {
        const details = await finetuningApi.getDetails(finetune);
        finetunes.push({
            id: finetune,
            name: details.finetune_details.trigger_word,
            createdAt: details.finetune_details.timestamp
        });
    }
    const list = finetunes.sort((a:any, b:any) => {
        if (a.createdAt < b.createdAt) {
            return -1;
          }
          if (a.createdAt > b.createdAt) {
            return 1;
          }
          return 0;
    }).map((finetune) => {
        return {
            name: `${ finetune.name } (v${ finetune.createdAt })`,
            value: finetune.id
        };
    });
    const input = await inquirer.prompt([{
        type: "list",
        name: "finetuneId",
        message: "Select a model for finetuning:",
        choices: list
    }]);
    return input.finetuneId;
}

export default initCommand;