#!/usr/bin/env node

import { Command } from "commander";
import { version, description } from "../package.json";
import generateImage from "./commands/generate-image";
import generateFinetune from "./commands/generate-finetune";
import initFinetune from "./commands/init-finetune";

const program = new Command();

const setup = () => {
    program
        .version(version)
        .description(description);

    generateImage(program);
    generateFinetune(program);
    initFinetune(program);

    program.parse();
};

setup();