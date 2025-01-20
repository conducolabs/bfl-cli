import chalk from "chalk";
import { Command } from "commander";
import fs from "fs";
import path from "path";
import archiver from "archiver";
import streamBuffers from "stream-buffers";
import axios from "axios";
import cliProgress from "cli-progress";
import Connector, { Finetune } from "@conducolabs/bfl-js";

const initCommand = (program: Command) => {
    program
        .command("generate-finetune")
        .option("-k, --apiKey <string>", "API key for the BFL API.")
        .option("-n, --name <string>", "Name of the finetuning model.")
        .option("-t, --trainingData <string>", "Path to the training data.")
        .option("-c, --configurationFile <string>", "Configuration file for the image generation.")
        .action(async (options) => {
            if (!options.apiKey) {
                console.log(chalk.red("⨯ API key is required."));
                return;
            }

            if (!options.name) {
                console.log(chalk.red("⨯ Name is required."));
                return;
            }

            if (!options.trainingData) {
                console.log(chalk.red("⨯ Training data is required."));
                return;
            } else {
                if (!fs.existsSync(path.resolve(options.trainingData))) {
                    console.log(chalk.red("⨯ Folder with training data does not exist."));
                    return;
                }
            }

            let configuration = {};

            if (!options.configurationFile) {
                console.log(chalk.red("⨯ Configuration file is required."));
                return; 
            } else {
                if (!fs.existsSync(path.resolve(options.configurationFile))) {
                    console.log(chalk.red("⨯ Configuration file does not exist."));
                    return;
                } else {
                    try {
                        configuration = JSON.parse(fs.readFileSync(path.resolve(options.configurationFile), "utf-8"));
                        console.log(chalk.green("✓"), "Configuration file loaded.");
                    } catch(error) {
                        console.log(chalk.red("⨯ Could not parse configuration file."));
                        console.log(chalk.red(error));
                        return;
                    }
                }
            }

            try {
                let compressionSpinner = loadingAnimation(() => `Compressing training data for upload...`);
                const trainingDataArchive = await generateZipToBase64String(path.resolve(options.trainingData));
                clearInterval(compressionSpinner);
                console.log("\n", chalk.green("✓"), "Training data compressed.");
                console.log(chalk.green("✓"), "Uploading training data...");
                const finetuneId = await uploadData(options.apiKey, options.name, trainingDataArchive, configuration);
                console.log(chalk.green("✓"), "Training data uploaded. Finetuning model ID:", finetuneId);
                const progressBar = new cliProgress.SingleBar({}, cliProgress.Presets.shades_classic);
                progressBar.start(100, 0);
                await checkTrainingStatus(options.apiKey, finetuneId, progressBar);
                return;
            } catch(error:any) {
                console.log(chalk.red("⨯ An error occurred while generating the finetuning model.", error.message));
            }

        });
};

const generateZipToBase64String =  async (directory: string):Promise<string> => {
    return new Promise((resolve, reject) => {
        const trainingDataArchive = archiver("zip", { zlib: { level: 9 } });
        let outputStreamBuffer = new streamBuffers.WritableStreamBuffer({
            initialSize: (1000 * 1024),
            incrementAmount: (1000 * 1024)
        });
        trainingDataArchive.pipe(outputStreamBuffer);
        trainingDataArchive.directory(directory, false);
        trainingDataArchive.on("error", (error) => {
            reject(error);
        });
        outputStreamBuffer.on("finish", () => {
            resolve(outputStreamBuffer.getContents().toString("base64"));
        });
        trainingDataArchive.finalize();
    });
}

const uploadData = async (apiKey: string, name: string, trainingData: string, configuration: any):Promise<string> => {
    const defaultConfiguration = {
        trigger_word: "TOK",
        mode: "general",
        iterations: 300,
        learning_rate: 0.00001,
        captioning: true,
        priority: "quality",
        finetune_type: "full",
        lora_rank: 32
    };

    const statusBar = new cliProgress.SingleBar({}, cliProgress.Presets.shades_classic);
    statusBar.start(100, 0);

    const request = await axios.post(`https://api.us1.bfl.ai/v1/finetune`, {
        ...defaultConfiguration,
        ...configuration,
        file_data: trainingData,
        finetune_comment: name
    }, {
        headers: {
            "X-Key": apiKey,
            "Accept": "application/json",
            "Content-Type": "application/json"
        },
        onUploadProgress: (progressEvent: any) => {
            let percentCompleted = Math.round((progressEvent.loaded * 100) / progressEvent.total);
            if (percentCompleted === 100) {
                statusBar.update(100);
                statusBar.stop();
            } else {
                statusBar.update(percentCompleted);
            }
        }
    });
    return request.data.finetune_id;
};

const checkTrainingStatus = async (apiKey:string, id:string, progress:any) => {
    const apiConnector = new Connector({ apiKey: apiKey })
    try {
        const status = await apiConnector.getStatus(id);
        if (status.status === "Ready") {
            progress.update(100);
            progress.stop();
            console.log(chalk.green("✓"), "Finetuning model is ready. Finetune model ID:", id);
            process.exit(0);
        } else if (status.status === "Pending") {
            progress.update(status.progress * 100);
            setTimeout(async () => { 
                await checkTrainingStatus(apiKey, id, progress);
            }, 10000);
        } else {
            progress.update(100);
            progress.stop();
            console.log(chalk.red("⨯"), "An error occurred while training the model:", status.status);
            process.exit(0);
        }
    } catch(error:any) {
        progress.update(100);
        progress.stop();
        console.log(chalk.red("⨯"), "An error occurred while training the model:", error.message);
        process.exit(0);
    }
};

const loadingAnimation = (getText:any, chars = ["⠙", "⠘", "⠰", "⠴", "⠤", "⠦", "⠆", "⠃", "⠋", "⠉"], delay = 100) => {
    let x = 0;

    return setInterval(function() {
        process.stdout.write("\r" + chars[x++] + " " + getText());
        x = x % chars.length;
    }, delay);
}

export default initCommand;