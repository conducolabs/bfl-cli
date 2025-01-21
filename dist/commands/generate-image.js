"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
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
const inquirer_1 = __importDefault(require("inquirer"));
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const bfl_js_1 = __importStar(require("@conducolabs/bfl-js"));
const cli_progress_1 = __importDefault(require("cli-progress"));
const axios_1 = __importDefault(require("axios"));
const initCommand = (program) => {
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
        .action((options) => __awaiter(void 0, void 0, void 0, function* () {
        if (!options.apiKey) {
            console.log(chalk_1.default.red("⨯ API key is required."));
            return;
        }
        if (!options.prompt) {
            console.log(chalk_1.default.red("⨯ Prompt is required."));
            return;
        }
        const models = ["flux-dev", "flux-pro", "flux-pro 1.1"];
        const fluxPro1Modes = ["none", "fill", "canny", "depth"];
        const fluxPro11Modes = ["none", "ultra"];
        let model = "";
        let mode = "none";
        const useFinetune = options.finetune ? true : false;
        let configuration = {};
        if (!options.model || !models.includes(options.model)) {
            try {
                const input = yield inquirer_1.default.prompt([{
                        type: "list",
                        name: "model",
                        message: "Select an image generation model:",
                        choices: models
                    }]);
                model = input.model;
            }
            catch (error) {
                return;
            }
        }
        else {
            model = options.model;
            console.log(chalk_1.default.green("✓"), `Model is set to "${options.model}".`);
        }
        if (!options.mode) {
            if (model === "flux-pro") {
                try {
                    const input = yield inquirer_1.default.prompt([{
                            type: "list",
                            name: "mode",
                            message: "Select if a tool should be used for image generation:",
                            choices: fluxPro1Modes
                        }]);
                    mode = input.mode;
                }
                catch (error) {
                    return;
                }
            }
            else if (model === "flux-pro 1.1") {
                try {
                    const input = yield inquirer_1.default.prompt([{
                            type: "list",
                            name: "mode",
                            message: "Select if a tool should be used for image generation:",
                            choices: fluxPro11Modes
                        }]);
                    mode = input.mode;
                }
                catch (error) {
                    return;
                }
            }
        }
        else {
            if (model === "flux-pro" && fluxPro1Modes.includes(options.mode)) {
                mode = options.mode;
                console.log(chalk_1.default.green("✓"), `Tool is set to "${options.mode}".`);
            }
            else if (model === "flux-pro 1.1" && fluxPro11Modes.includes(options.mode)) {
                mode = options.mode;
                console.log(chalk_1.default.green("✓"), `Tool is set to "${options.mode}".`);
            }
        }
        if (!options.output) {
            console.log(chalk_1.default.red("⨯ Output location is required."));
            return;
        }
        if (!fs_1.default.existsSync(path_1.default.resolve(options.output))) {
            try {
                console.log(path_1.default.resolve(options.output));
                fs_1.default.mkdirSync(path_1.default.resolve(options.output), { recursive: true });
                console.log(chalk_1.default.green("✓"), "Output location created.");
            }
            catch (error) {
                console.log(chalk_1.default.red("⨯ Could not create output location."));
                return;
            }
            return;
        }
        else {
            console.log(chalk_1.default.green("✓"), "Output location exists.");
        }
        if (options.configurationFile) {
            if (!fs_1.default.existsSync(path_1.default.resolve(options.configurationFile))) {
                console.log(chalk_1.default.red("⨯ Configuration file does not exist."));
                return;
            }
            else {
                try {
                    configuration = JSON.parse(fs_1.default.readFileSync(path_1.default.resolve(options.configurationFile)).toString());
                    console.log(chalk_1.default.green("✓"), "Configuration file loaded.");
                }
                catch (error) {
                    console.log(chalk_1.default.red("⨯ Could not parse configuration file."));
                    return;
                }
            }
        }
        const bflApi = new bfl_js_1.default({ apiKey: options.apiKey });
        switch (model) {
            case "flux-dev":
                const fluxDev1 = new bfl_js_1.FluxDev1(bflApi);
                try {
                    const image = yield fluxDev1.generateImage(options.prompt, configuration);
                    console.log(chalk_1.default.green("✓"), "Image generation in progress...");
                    const statusBar = new cli_progress_1.default.SingleBar({}, cli_progress_1.default.Presets.shades_classic);
                    statusBar.start(100, 0);
                    yield fetchImageDetails(bflApi, image.id, statusBar, downloadImage, options.output);
                }
                catch (error) {
                    console.log(chalk_1.default.red("⨯ Could not generate image.", error.message));
                }
                break;
            case "flux-pro":
                try {
                    if (useFinetune) {
                        const fluxPro1Finetuned = new bfl_js_1.FluxPro1Finetuned(bflApi);
                        let finetuneId = options.finetune;
                        if (finetuneId === "select") {
                            finetuneId = yield selectExistingFinetuneModel(bflApi);
                        }
                        if (mode === "fill") {
                            let maskImagePath = "";
                            let preImagePath = "";
                            if (!options.controlImage) {
                                const input = yield inquirer_1.default.prompt([{
                                        type: "input",
                                        name: "maskImage",
                                        message: "Please provide the path to a mask image:"
                                    }]);
                                maskImagePath = input.maskImage;
                            }
                            if (!fs_1.default.existsSync(path_1.default.resolve(maskImagePath))) {
                                console.log(chalk_1.default.red("⨯ Control image does not exist."));
                                return;
                            }
                            if (!options.image) {
                                const input = yield inquirer_1.default.prompt([{
                                        type: "input",
                                        name: "image",
                                        message: "Please provide the path to a base image:"
                                    }]);
                                preImagePath = input.image;
                            }
                            if (!fs_1.default.existsSync(path_1.default.resolve(preImagePath))) {
                                console.log(chalk_1.default.red("⨯ Image does not exist."));
                                return;
                            }
                            const maskImage = loadImageToBase64(path_1.default.resolve(maskImagePath));
                            const preImage = loadImageToBase64(path_1.default.resolve(preImagePath));
                            const image = yield fluxPro1Finetuned.generateImageWithMask(options.prompt, finetuneId, Object.assign(Object.assign({}, configuration), { mask: maskImage, image: preImage }));
                            console.log(chalk_1.default.green("✓"), "Image generation in progress...");
                            const statusBar = new cli_progress_1.default.SingleBar({}, cli_progress_1.default.Presets.shades_classic);
                            statusBar.start(100, 0);
                            yield fetchImageDetails(bflApi, image.id, statusBar, downloadImage, options.output);
                        }
                        else if (mode === "canny") {
                            let controlImagePath = "";
                            if (!options.controlImage) {
                                const input = yield inquirer_1.default.prompt([{
                                        type: "input",
                                        name: "controlImage",
                                        message: "Please provide the path to a control image:"
                                    }]);
                                controlImagePath = input.controlImage;
                            }
                            if (!fs_1.default.existsSync(path_1.default.resolve(controlImagePath))) {
                                console.log(chalk_1.default.red("⨯ Control image does not exist."));
                                return;
                            }
                            const controlImage = loadImageToBase64(path_1.default.resolve(controlImagePath));
                            const image = yield fluxPro1Finetuned.generateCannyImageWithControlImage(options.prompt, finetuneId, Object.assign(Object.assign({}, configuration), { control_image: controlImage }));
                            console.log(chalk_1.default.green("✓"), "Image generation in progress...");
                            const statusBar = new cli_progress_1.default.SingleBar({}, cli_progress_1.default.Presets.shades_classic);
                            statusBar.start(100, 0);
                            yield fetchImageDetails(bflApi, image.id, statusBar, downloadImage, options.output);
                        }
                        else if (mode === "depth") {
                            let controlImagePath = "";
                            if (!options.controlImage) {
                                const input = yield inquirer_1.default.prompt([{
                                        type: "input",
                                        name: "controlImage",
                                        message: "Please provide the path to a control image:"
                                    }]);
                                controlImagePath = input.controlImage;
                            }
                            if (!fs_1.default.existsSync(path_1.default.resolve(controlImagePath))) {
                                console.log(chalk_1.default.red("⨯ Control image does not exist."));
                                return;
                            }
                            const controlImage = loadImageToBase64(path_1.default.resolve(controlImagePath));
                            const image = yield fluxPro1Finetuned.generateDepthImageWithControlImage(options.prompt, finetuneId, Object.assign(Object.assign({}, configuration), { control_image: controlImage }));
                            console.log(chalk_1.default.green("✓"), "Image generation in progress...");
                            const statusBar = new cli_progress_1.default.SingleBar({}, cli_progress_1.default.Presets.shades_classic);
                            statusBar.start(100, 0);
                            yield fetchImageDetails(bflApi, image.id, statusBar, downloadImage, options.output);
                        }
                        else {
                            const image = yield fluxPro1Finetuned.generateImage(options.prompt, finetuneId, configuration);
                            console.log(chalk_1.default.green("✓"), "Image generation in progress...");
                            const statusBar = new cli_progress_1.default.SingleBar({}, cli_progress_1.default.Presets.shades_classic);
                            statusBar.start(100, 0);
                            yield fetchImageDetails(bflApi, image.id, statusBar, downloadImage, options.output);
                        }
                    }
                    else {
                        const fluxPro1 = new bfl_js_1.FluxPro1(bflApi);
                        if (mode === "fill") {
                            let maskImagePath = "";
                            let preImagePath = "";
                            if (!options.controlImage) {
                                const input = yield inquirer_1.default.prompt([{
                                        type: "input",
                                        name: "maskImage",
                                        message: "Please provide the path to a mask image:"
                                    }]);
                                maskImagePath = input.maskImage;
                            }
                            if (!fs_1.default.existsSync(path_1.default.resolve(maskImagePath))) {
                                console.log(chalk_1.default.red("⨯ Control image does not exist."));
                                return;
                            }
                            if (!options.image) {
                                const input = yield inquirer_1.default.prompt([{
                                        type: "input",
                                        name: "image",
                                        message: "Please provide the path to a base image:"
                                    }]);
                                preImagePath = input.image;
                            }
                            if (!fs_1.default.existsSync(path_1.default.resolve(preImagePath))) {
                                console.log(chalk_1.default.red("⨯ Image does not exist."));
                                return;
                            }
                            const maskImage = loadImageToBase64(path_1.default.resolve(maskImagePath));
                            const preImage = loadImageToBase64(path_1.default.resolve(preImagePath));
                            const image = yield fluxPro1.generateImageWithMask(options.prompt, Object.assign(Object.assign({}, configuration), { mask: maskImage, image: preImage }));
                            console.log(chalk_1.default.green("✓"), "Image generation in progress...");
                            const statusBar = new cli_progress_1.default.SingleBar({}, cli_progress_1.default.Presets.shades_classic);
                            statusBar.start(100, 0);
                            yield fetchImageDetails(bflApi, image.id, statusBar, downloadImage, options.output);
                        }
                        else if (mode === "canny") {
                            let controlImagePath = "";
                            let preprocessedImagePath = "";
                            if (!options.controlImage) {
                                const input = yield inquirer_1.default.prompt([{
                                        type: "input",
                                        name: "controlImage",
                                        message: "Please provide the path to a control image:"
                                    }]);
                                controlImagePath = input.controlImage;
                            }
                            if (!fs_1.default.existsSync(path_1.default.resolve(controlImagePath))) {
                                console.log(chalk_1.default.red("⨯ Control image does not exist."));
                                return;
                            }
                            const controlImage = loadImageToBase64(path_1.default.resolve(controlImagePath));
                            if (!options.preprocessedImage) {
                                const input = yield inquirer_1.default.prompt([{
                                        type: "input",
                                        name: "preprocessedImage",
                                        message: "Please provide the path to a preprocessed image. If you don't want to use a preprocessed image, just hit ENTER:"
                                    }]);
                                preprocessedImagePath = input.preprocessedImage;
                            }
                            if (preprocessedImagePath !== "") {
                                if (!fs_1.default.existsSync(path_1.default.resolve(preprocessedImagePath))) {
                                    console.log(chalk_1.default.red("⨯ Preprocessed image does not exist."));
                                    return;
                                }
                                const preprocessedImage = loadImageToBase64(path_1.default.resolve(preprocessedImagePath));
                                const image = yield fluxPro1.generateCannyImageWithControlImage(options.prompt, Object.assign(Object.assign({}, configuration), { control_image: controlImage, preprocessed_image: preprocessedImage }));
                                console.log(chalk_1.default.green("✓"), "Image generation in progress...");
                                const statusBar = new cli_progress_1.default.SingleBar({}, cli_progress_1.default.Presets.shades_classic);
                                statusBar.start(100, 0);
                                yield fetchImageDetails(bflApi, image.id, statusBar, downloadImage, options.output);
                            }
                            else {
                                const image = yield fluxPro1.generateCannyImageWithControlImage(options.prompt, Object.assign(Object.assign({}, configuration), { control_image: controlImage }));
                                console.log(chalk_1.default.green("✓"), "Image generation in progress...");
                                const statusBar = new cli_progress_1.default.SingleBar({}, cli_progress_1.default.Presets.shades_classic);
                                statusBar.start(100, 0);
                                yield fetchImageDetails(bflApi, image.id, statusBar, downloadImage, options.output);
                            }
                        }
                        else if (mode === "depth") {
                            let controlImagePath = "";
                            let preprocessedImagePath = "";
                            if (!options.controlImage) {
                                const input = yield inquirer_1.default.prompt([{
                                        type: "input",
                                        name: "controlImage",
                                        message: "Please provide the path to a control image:"
                                    }]);
                                controlImagePath = input.controlImage;
                            }
                            if (!fs_1.default.existsSync(path_1.default.resolve(controlImagePath))) {
                                console.log(chalk_1.default.red("⨯ Control image does not exist."));
                                return;
                            }
                            const controlImage = loadImageToBase64(path_1.default.resolve(controlImagePath));
                            if (!options.preprocessedImage) {
                                const input = yield inquirer_1.default.prompt([{
                                        type: "input",
                                        name: "preprocessedImage",
                                        message: "Please provide the path to a preprocessed image. If you don't want to use a preprocessed image, just hit ENTER:"
                                    }]);
                                preprocessedImagePath = input.preprocessedImage;
                            }
                            if (preprocessedImagePath !== "") {
                                if (!fs_1.default.existsSync(path_1.default.resolve(preprocessedImagePath))) {
                                    console.log(chalk_1.default.red("⨯ Preprocessed image does not exist."));
                                    return;
                                }
                                const preprocessedImage = loadImageToBase64(path_1.default.resolve(preprocessedImagePath));
                                const image = yield fluxPro1.generateDepthImageWithControlImage(options.prompt, Object.assign(Object.assign({}, configuration), { control_image: controlImage, preprocessed_image: preprocessedImage }));
                                console.log(chalk_1.default.green("✓"), "Image generation in progress...");
                                const statusBar = new cli_progress_1.default.SingleBar({}, cli_progress_1.default.Presets.shades_classic);
                                statusBar.start(100, 0);
                                yield fetchImageDetails(bflApi, image.id, statusBar, downloadImage, options.output);
                            }
                            else {
                                const image = yield fluxPro1.generateDepthImageWithControlImage(options.prompt, Object.assign(Object.assign({}, configuration), { control_image: controlImage }));
                                console.log(chalk_1.default.green("✓"), "Image generation in progress...");
                                const statusBar = new cli_progress_1.default.SingleBar({}, cli_progress_1.default.Presets.shades_classic);
                                statusBar.start(100, 0);
                                yield fetchImageDetails(bflApi, image.id, statusBar, downloadImage, options.output);
                            }
                        }
                        else {
                            const image = yield fluxPro1.generateImage(options.prompt, configuration);
                            console.log(chalk_1.default.green("✓"), "Image generation in progress...");
                            const statusBar = new cli_progress_1.default.SingleBar({}, cli_progress_1.default.Presets.shades_classic);
                            statusBar.start(100, 0);
                            yield fetchImageDetails(bflApi, image.id, statusBar, downloadImage, options.output);
                        }
                    }
                }
                catch (error) {
                    console.log(chalk_1.default.red("⨯ Could not generate image.", error.message));
                    return;
                }
                break;
            case "flux-pro 1.1":
                try {
                    if (useFinetune) {
                        const fluxPro11Finetuned = new bfl_js_1.FluxPro11Finetuned(bflApi);
                        let finetuneId = options.finetune;
                        if (finetuneId === "select") {
                            finetuneId = yield selectExistingFinetuneModel(bflApi);
                        }
                        if (mode === "ultra") {
                            const image = yield fluxPro11Finetuned.generateUltraImage(options.prompt, finetuneId, configuration);
                            console.log(chalk_1.default.green("✓"), "Image generation in progress...");
                            const statusBar = new cli_progress_1.default.SingleBar({}, cli_progress_1.default.Presets.shades_classic);
                            statusBar.start(100, 0);
                            yield fetchImageDetails(bflApi, image.id, statusBar, downloadImage, options.output);
                        }
                        else {
                            const image = yield fluxPro11Finetuned.generateImage(options.prompt, finetuneId, configuration);
                            console.log(chalk_1.default.green("✓"), "Image generation in progress...");
                            const statusBar = new cli_progress_1.default.SingleBar({}, cli_progress_1.default.Presets.shades_classic);
                            statusBar.start(100, 0);
                            yield fetchImageDetails(bflApi, image.id, statusBar, downloadImage, options.output);
                        }
                    }
                    else {
                        const fluxPro11 = new bfl_js_1.FluxPro11(bflApi);
                        if (mode === "ultra") {
                            const image = yield fluxPro11.generateUltraImage(options.prompt, configuration);
                            console.log(chalk_1.default.green("✓"), "Image generation in progress...");
                            const statusBar = new cli_progress_1.default.SingleBar({}, cli_progress_1.default.Presets.shades_classic);
                            statusBar.start(100, 0);
                            yield fetchImageDetails(bflApi, image.id, statusBar, downloadImage, options.output);
                        }
                        else {
                            const image = yield fluxPro11.generateImage(options.prompt, configuration);
                            console.log(chalk_1.default.green("✓"), "Image generation in progress...");
                            const statusBar = new cli_progress_1.default.SingleBar({}, cli_progress_1.default.Presets.shades_classic);
                            statusBar.start(100, 0);
                            yield fetchImageDetails(bflApi, image.id, statusBar, downloadImage, options.output);
                        }
                    }
                }
                catch (error) {
                    console.log(chalk_1.default.red("⨯ Could not generate image.", error));
                    return;
                }
                break;
        }
    }));
};
const fetchImageDetails = (bflApi, imageId, statusBar, downloadFunction, output) => __awaiter(void 0, void 0, void 0, function* () {
    const status = yield bflApi.getStatus(imageId);
    if (status.status === "Ready") {
        statusBar.update(100);
        statusBar.stop();
        yield downloadFunction(imageId, status.result.sample, output);
    }
    else {
        statusBar.update(status.progress * 100);
        setTimeout(() => __awaiter(void 0, void 0, void 0, function* () {
            yield fetchImageDetails(bflApi, imageId, statusBar, downloadFunction, output);
        }), 1000);
    }
});
const downloadImage = (id, url, location) => __awaiter(void 0, void 0, void 0, function* () {
    console.log(chalk_1.default.green("✓"), "Image generation done. Downloading file...");
    const statusBar = new cli_progress_1.default.SingleBar({}, cli_progress_1.default.Presets.shades_classic);
    statusBar.start(100, 0);
    const response = yield axios_1.default.get(url, {
        responseType: "arraybuffer",
        onDownloadProgress: (progressEvent) => {
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
    const fileData = Buffer.from(response.data, "binary");
    let extension = "jpeg";
    if (response.headers["content-type"] === "image/png") {
        extension = "png";
    }
    fs_1.default.writeFileSync(path_1.default.resolve(`${location}/${id}.${extension}`), fileData);
    setTimeout(() => {
        console.log(chalk_1.default.green(`✓ Download finished. File saved at ${location}/${id}.${extension}`));
        process.exit(0);
    }, 1000);
});
const loadImageToBase64 = (path) => {
    return fs_1.default.readFileSync(path, { encoding: "base64" });
};
const selectExistingFinetuneModel = (bflApi) => __awaiter(void 0, void 0, void 0, function* () {
    const finetuningApi = new bfl_js_1.Finetune(bflApi);
    const finetuningIds = yield finetuningApi.getList();
    const finetunes = [];
    for (const finetune of finetuningIds.finetunes) {
        const details = yield finetuningApi.getDetails(finetune);
        finetunes.push({
            id: finetune,
            name: details.finetune_details.trigger_word,
            createdAt: details.finetune_details.timestamp
        });
    }
    const list = finetunes.sort((a, b) => {
        if (a.createdAt < b.createdAt) {
            return -1;
        }
        if (a.createdAt > b.createdAt) {
            return 1;
        }
        return 0;
    }).map((finetune) => {
        return {
            name: `${finetune.name} (v${finetune.createdAt})`,
            value: finetune.id
        };
    });
    const input = yield inquirer_1.default.prompt([{
            type: "list",
            name: "finetuneId",
            message: "Select a model for finetuning:",
            choices: list
        }]);
    return input.finetuneId;
});
exports.default = initCommand;
