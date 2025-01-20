"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const chalk_1 = __importDefault(require("chalk"));
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const archiver_1 = __importDefault(require("archiver"));
const stream_buffers_1 = __importDefault(require("stream-buffers"));
const axios_1 = __importDefault(require("axios"));
const cli_progress_1 = __importDefault(require("cli-progress"));
const bfl_js_1 = __importDefault(require("@conducolabs/bfl-js"));
const initCommand = (program) => {
    program
        .command("generate-finetune")
        .option("-k, --apiKey <string>", "API key for the BFL API.")
        .option("-n, --name <string>", "Name of the finetuning model.")
        .option("-t, --trainingData <string>", "Path to the training data.")
        .option("-c, --configurationFile <string>", "Configuration file for the image generation.")
        .action((options) => __awaiter(void 0, void 0, void 0, function* () {
        if (!options.apiKey) {
            console.log(chalk_1.default.red("⨯ API key is required."));
            return;
        }
        if (!options.name) {
            console.log(chalk_1.default.red("⨯ Name is required."));
            return;
        }
        if (!options.trainingData) {
            console.log(chalk_1.default.red("⨯ Training data is required."));
            return;
        }
        else {
            if (!fs_1.default.existsSync(path_1.default.resolve(options.trainingData))) {
                console.log(chalk_1.default.red("⨯ Folder with training data does not exist."));
                return;
            }
        }
        let configuration = {};
        if (!options.configurationFile) {
            console.log(chalk_1.default.red("⨯ Configuration file is required."));
            return;
        }
        else {
            if (!fs_1.default.existsSync(path_1.default.resolve(options.configurationFile))) {
                console.log(chalk_1.default.red("⨯ Configuration file does not exist."));
                return;
            }
            else {
                try {
                    configuration = JSON.parse(fs_1.default.readFileSync(path_1.default.resolve(options.configurationFile), "utf-8"));
                    console.log(chalk_1.default.green("✓"), "Configuration file loaded.");
                }
                catch (error) {
                    console.log(chalk_1.default.red("⨯ Could not parse configuration file."));
                    console.log(chalk_1.default.red(error));
                    return;
                }
            }
        }
        try {
            let compressionSpinner = loadingAnimation(() => `Compressing training data for upload...`);
            const trainingDataArchive = yield generateZipToBase64String(path_1.default.resolve(options.trainingData));
            clearInterval(compressionSpinner);
            console.log("\n", chalk_1.default.green("✓"), "Training data compressed.");
            console.log(chalk_1.default.green("✓"), "Uploading training data...");
            const finetuneId = yield uploadData(options.apiKey, options.name, trainingDataArchive, configuration);
            console.log(chalk_1.default.green("✓"), "Training data uploaded. Finetuning model ID:", finetuneId);
            const progressBar = new cli_progress_1.default.SingleBar({}, cli_progress_1.default.Presets.shades_classic);
            progressBar.start(100, 0);
            yield checkTrainingStatus(options.apiKey, finetuneId, progressBar);
            return;
        }
        catch (error) {
            console.log(chalk_1.default.red("⨯ An error occurred while generating the finetuning model.", error.message));
        }
    }));
};
const generateZipToBase64String = (directory) => __awaiter(void 0, void 0, void 0, function* () {
    return new Promise((resolve, reject) => {
        const trainingDataArchive = (0, archiver_1.default)("zip", { zlib: { level: 9 } });
        let outputStreamBuffer = new stream_buffers_1.default.WritableStreamBuffer({
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
});
const uploadData = (apiKey, name, trainingData, configuration) => __awaiter(void 0, void 0, void 0, function* () {
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
    const statusBar = new cli_progress_1.default.SingleBar({}, cli_progress_1.default.Presets.shades_classic);
    statusBar.start(100, 0);
    const request = yield axios_1.default.post(`https://api.us1.bfl.ai/v1/finetune`, Object.assign(Object.assign(Object.assign({}, defaultConfiguration), configuration), { file_data: trainingData, finetune_comment: name }), {
        headers: {
            "X-Key": apiKey,
            "Accept": "application/json",
            "Content-Type": "application/json"
        },
        onUploadProgress: (progressEvent) => {
            let percentCompleted = Math.round((progressEvent.loaded * 100) / progressEvent.total);
            if (percentCompleted === 100) {
                statusBar.update(100);
                statusBar.stop();
            }
            else {
                statusBar.update(percentCompleted);
            }
        }
    });
    return request.data.finetune_id;
});
const checkTrainingStatus = (apiKey, id, progress) => __awaiter(void 0, void 0, void 0, function* () {
    const apiConnector = new bfl_js_1.default({ apiKey: apiKey });
    try {
        const status = yield apiConnector.getStatus(id);
        if (status.status === "Ready") {
            progress.update(100);
            progress.stop();
            console.log(chalk_1.default.green("✓"), "Finetuning model is ready. Finetune model ID:", id);
            process.exit(0);
        }
        else if (status.status === "Pending") {
            progress.update(status.progress * 100);
            setTimeout(() => __awaiter(void 0, void 0, void 0, function* () {
                yield checkTrainingStatus(apiKey, id, progress);
            }), 10000);
        }
        else {
            progress.update(100);
            progress.stop();
            console.log(chalk_1.default.red("⨯"), "An error occurred while training the model:", status.status);
            process.exit(0);
        }
    }
    catch (error) {
        progress.update(100);
        progress.stop();
        console.log(chalk_1.default.red("⨯"), "An error occurred while training the model:", error.message);
        process.exit(0);
    }
});
const loadingAnimation = (getText, chars = ["⠙", "⠘", "⠰", "⠴", "⠤", "⠦", "⠆", "⠃", "⠋", "⠉"], delay = 100) => {
    let x = 0;
    return setInterval(function () {
        process.stdout.write("\r" + chars[x++] + " " + getText());
        x = x % chars.length;
    }, delay);
};
exports.default = initCommand;
