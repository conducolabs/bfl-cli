import fs from "fs";
import { Command } from "commander";
import chalk from "chalk";
import path from "path";

const initCommand = (program: Command) => {
    program
        .command("init-finetune")
        .option("-o --output <string>", "Output location for the training data for finetuning.")
        .option("-t --triggerWord <string>", "Trigger word for the finetuned model.")
        .action(async (options) => {
            if (!options.output) {
                console.log(chalk.red("⨯ Output location is required."));
                return;
            }

            if (!options.triggerWord) {
                console.log(chalk.red("⨯ Trigger word is required."));
                return;
            }

            if (!fs.existsSync(path.resolve(options.output))) {
                try {
                    fs.mkdirSync(path.resolve(options.output), { recursive: true });
                    console.log(chalk.green("✓"), "Output location created.");
                } catch(error) {
                    console.log(chalk.red("⨯ Output location could not be created."));
                    return;
                }
            }

            try {
                fs.mkdirSync(path.resolve(`${ options.output }/data`), { recursive: true });
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
                fs.writeFileSync(path.resolve(`${ options.output }/config.json`), JSON.stringify(defaultConfig, null, 4));
                console.log(chalk.green("✓"), "Configuration file created.");
                fs.writeFileSync(path.resolve(`${ options.output }/data/${ convertToValidFilename(options.triggerWord).toLowerCase() }-1.txt`), "An illustration of an astronaut on white background. The astronaut is wearing a helmet and a space suite. The space suite is colored in white, green and blue. He is holding a laptop in one of his hands.");
                fs.copyFileSync(path.resolve(__dirname, "../../sampleData/sample1.jpeg"), path.resolve(`${ options.output }/data/${ convertToValidFilename(options.triggerWord).toLowerCase() }-1.jpeg`));
                console.log(chalk.green("✓"), `Example files created. Please replace the example files with your training data here: ${ path.resolve(options.output) }/data`);
                console.log(chalk.green("✓"), "Initialization complete. Add your training data and run the following command to train your model:", chalk.green(`npx @conducolabs/bfl-cli --apiKey 'INSERT YOUR API KEY' --name "${ options.triggerWord }" --trainingData "${ path.resolve(options.output) }/data" --configurationFile "${ path.resolve(options.output) }/config.json"`));
                process.exit(0);
            } catch(error:any) {
                console.log(chalk.red("⨯ An error occurred while initializing the finetuning model.", error.message));
                return;
            }
        });
}

const convertToValidFilename = (string:string) =>  {
    return (string.replace(/[\/|\\:*?"<>]/g, " "));
};

export default initCommand;