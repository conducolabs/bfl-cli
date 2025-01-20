#!/usr/bin/env node
"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const commander_1 = require("commander");
const package_json_1 = require("../package.json");
const generate_image_1 = __importDefault(require("./commands/generate-image"));
const generate_finetune_1 = __importDefault(require("./commands/generate-finetune"));
const init_finetune_1 = __importDefault(require("./commands/init-finetune"));
const program = new commander_1.Command();
const setup = () => {
    program
        .version(package_json_1.version)
        .description(package_json_1.description);
    (0, generate_image_1.default)(program);
    (0, generate_finetune_1.default)(program);
    (0, init_finetune_1.default)(program);
    program.parse();
};
setup();
