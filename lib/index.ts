#!/usr/bin/env node

import { Command } from "commander";
import Connector, { FluxDev1, FluxPro1, FluxPro11, FluxPro11Finetuned, FluxPro1Finetuned } from "@conducolabs/bfl-js";
import { version, description } from "../package.json";
import chalk from "chalk";
import inquirer from "inquirer";
import fs from "fs";
import path from "path";
import cliProgress from "cli-progress";
import axios from "axios";

const program = new Command();

const setup = () => {
    program
        .version(version)
        .description(description);

    program
        .command("generate-image")
        .option("-p, --prompt <string>", "Prompt for the image generation")
        .option("-m, --model <string>", "Model to use for the image generation")
        .option("-o, --output <string>", "Output location for the image")
        .option("-c, --configurationFile <string>", "Configuration file for the image generation")
        .option("-f, --finetuneId <string>", "Finetune ID for the image generation")
        .option("-k, --apiKey <string>", "API key for the BFL API.")
        .option("-t --tool <string>", "Tool to be used for the image generation")
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
            const useFinetune = options.finetuneId ? true : false;

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
                    } catch(error) {
                        console.log(error);
                        console.log(chalk.red("⨯ Could not generate image."));
                        return;
                    }
                    break;
                case "flux-pro":
                    try {
                        if (useFinetune) {
                            const fluxPro1Finetuned = new FluxPro1Finetuned(bflApi);
                            if (mode === "fill") {
                                const image = await fluxPro1Finetuned.generateImageWithMask(options.prompt, options.finetuneId, configuration);
                                console.log(chalk.green("✓"), "Image generation in progress...");
                                const statusBar = new cliProgress.SingleBar({}, cliProgress.Presets.shades_classic);
                                statusBar.start(100, 0);
                                await fetchImageDetails(bflApi, image.id, statusBar, downloadImage, options.output);
                            } else if (mode === "canny") {
                                const image = await fluxPro1Finetuned.generateCannyImageWithControlImage(options.prompt, options.finetuneId, configuration);
                                console.log(chalk.green("✓"), "Image generation in progress...");
                                const statusBar = new cliProgress.SingleBar({}, cliProgress.Presets.shades_classic);
                                statusBar.start(100, 0);
                                await fetchImageDetails(bflApi, image.id, statusBar, downloadImage, options.output);
                            } else if (mode === "depth") {
                                const image = await fluxPro1Finetuned.generateDepthImageWithControlImage(options.prompt, options.finetuneId, configuration);
                                console.log(chalk.green("✓"), "Image generation in progress...");
                                const statusBar = new cliProgress.SingleBar({}, cliProgress.Presets.shades_classic);
                                statusBar.start(100, 0);
                                await fetchImageDetails(bflApi, image.id, statusBar, downloadImage, options.output);
                            } else {
                                const image = await fluxPro1Finetuned.generateImage(options.prompt, options.finetuneId, configuration);
                                console.log(chalk.green("✓"), "Image generation in progress...");
                                const statusBar = new cliProgress.SingleBar({}, cliProgress.Presets.shades_classic);
                                statusBar.start(100, 0);
                                await fetchImageDetails(bflApi, image.id, statusBar, downloadImage, options.output);
                            }
                        } else {
                            const fluxPro1 = new FluxPro1(bflApi);
                            if (mode === "fill") {
                                const image = await fluxPro1.generateImageWithMask(options.prompt, configuration);
                                console.log(chalk.green("✓"), "Image generation in progress...");
                                const statusBar = new cliProgress.SingleBar({}, cliProgress.Presets.shades_classic);
                                statusBar.start(100, 0);
                                await fetchImageDetails(bflApi, image.id, statusBar, downloadImage, options.output);
                            } else if (mode === "canny") {
                                const image = await fluxPro1.generateCannyImageWithControlImage(options.prompt, configuration);
                                console.log(chalk.green("✓"), "Image generation in progress...");
                                const statusBar = new cliProgress.SingleBar({}, cliProgress.Presets.shades_classic);
                                statusBar.start(100, 0);
                                await fetchImageDetails(bflApi, image.id, statusBar, downloadImage, options.output);
                            } else if (mode === "depth") {
                                const image = await fluxPro1.generateDepthImageWithControlImage(options.prompt, configuration);
                                console.log(chalk.green("✓"), "Image generation in progress...");
                                const statusBar = new cliProgress.SingleBar({}, cliProgress.Presets.shades_classic);
                                statusBar.start(100, 0);
                                await fetchImageDetails(bflApi, image.id, statusBar, downloadImage, options.output);
                            } else {
                                const image = await fluxPro1.generateImage(options.prompt, configuration);
                                console.log(chalk.green("✓"), "Image generation in progress...");
                                const statusBar = new cliProgress.SingleBar({}, cliProgress.Presets.shades_classic);
                                statusBar.start(100, 0);
                                await fetchImageDetails(bflApi, image.id, statusBar, downloadImage, options.output);
                            }
                        }
                    } catch(error) {
                        console.log(error);
                        console.log(chalk.red("⨯ Could not generate image."));
                        return;
                    }
                    break;
                    case "flux-pro 1.1":
                        try {
                            if (useFinetune) {
                                const fluxPro11Finetuned = new FluxPro11Finetuned(bflApi);
                                if (mode === "ultra") {
                                    const image = await fluxPro11Finetuned.generateUltraImage(options.prompt, options.finetuneId, configuration);
                                    console.log(chalk.green("✓"), "Image generation in progress...");
                                    const statusBar = new cliProgress.SingleBar({}, cliProgress.Presets.shades_classic);
                                    statusBar.start(100, 0);
                                    await fetchImageDetails(bflApi, image.id, statusBar, downloadImage, options.output);
                                } else {
                                    const image = await fluxPro11Finetuned.generateImage(options.prompt, options.finetuneId, configuration);
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
                        } catch(error) {
                            console.log(error);
                            console.log(chalk.red("⨯ Could not generate image."));
                            return;
                        }
                        break;
            }
        });

    program.parse();
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
    const response = await axios.get(url, { responseType: "arraybuffer" });
    const fileData = Buffer.from(response.data, "binary");
    let extension = "jpeg";
    if (response.headers["content-type"] === "image/png") {
        extension = "png";
    }
    fs.writeFileSync(path.resolve(`${ location }/${ id }.${ extension }`), fileData);
    console.log(chalk.green(`✓ Download finished. File saved at ${ location }/${ id }.${ extension }`));
}

setup();