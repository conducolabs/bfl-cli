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
const fs_1 = __importDefault(require("fs"));
const chalk_1 = __importDefault(require("chalk"));
const path_1 = __importDefault(require("path"));
const initCommand = (program) => {
    program
        .command("init-finetune")
        .option("-o --output <string>", "Output location for the training data for finetuning.")
        .option("-t --triggerWord <string>", "Trigger word for the finetuned model.")
        .action((options) => __awaiter(void 0, void 0, void 0, function* () {
        if (!options.output) {
            console.log(chalk_1.default.red("⨯ Output location is required."));
            return;
        }
        if (!options.triggerWord) {
            console.log(chalk_1.default.red("⨯ Trigger word is required."));
            return;
        }
        if (!fs_1.default.existsSync(path_1.default.resolve(options.output))) {
            try {
                fs_1.default.mkdirSync(path_1.default.resolve(options.output), { recursive: true });
                console.log(chalk_1.default.green("✓"), "Output location created.");
            }
            catch (error) {
                console.log(chalk_1.default.red("⨯ Output location could not be created."));
                return;
            }
        }
        try {
            fs_1.default.mkdirSync(path_1.default.resolve(`${options.output}/data`), { recursive: true });
            const defaultConfig = {
                trigger_word: options.triggerWord,
                mode: "general",
                iterations: 300,
                learning_rate: 0.00001,
                captioning: true,
                priority: "quality",
                finetune_type: "full",
                lora_rank: 32
            };
            fs_1.default.writeFileSync(path_1.default.resolve(`${options.output}/config.json`), JSON.stringify(defaultConfig, null, 4));
            console.log(chalk_1.default.green("✓"), "Configuration file created.");
            fs_1.default.writeFileSync(path_1.default.resolve(`${options.output}/data/${convertToValidFilename(options.triggerWord).toLowerCase()}-1.txt`), "An illustration of an astronaut on white background. The astronaut is wearing a helmet and a space suite. The space suite is colored in white, green and blue. He is holding a laptop in one of his hands.");
            fs_1.default.copyFileSync(path_1.default.resolve(__dirname, "../../sampleData/sample1.jpeg"), path_1.default.resolve(`${options.output}/data/${convertToValidFilename(options.triggerWord).toLowerCase()}-1.jpeg`));
            console.log(chalk_1.default.green("✓"), `Example files created. Please replace the example files with your training data here: ${path_1.default.resolve(options.output)}/data`);
            console.log(chalk_1.default.green("✓"), "Initialization complete. Add your training data and run the following command to train your model:", chalk_1.default.green(`npx @conducolabs/bfl-cli generate-finetune --apiKey "INSERT YOUR API KEY" --name "${options.triggerWord}" --trainingData "${path_1.default.resolve(options.output)}/data" --configurationFile "${path_1.default.resolve(options.output)}/config.json"`));
            process.exit(0);
        }
        catch (error) {
            console.log(chalk_1.default.red("⨯ An error occurred while initializing the finetuning model.", error.message));
            return;
        }
    }));
};
const convertToValidFilename = (string) => {
    return (string.replace(/[\/|\\:*?"<>]/g, " "));
};
exports.default = initCommand;
