# CLI for Black Forest Labs
A command line tool to interact with the Black Forest Labs API.

## Installation
To install the CLI tool, please execute this command in your command line:

```shell
npm install @conducolabs/bfl-cli -g
```
To use this CLI, you'll need to obtain an API token. Please register [here](https://api.us1.bfl.ai/).
## Usage
This CLI provides four functions:
```shell
// Generate an image
npx @conducolabs/bfl-cli generate-image --apiKey "YOUR API KEY" --prompt "A happy dog wearing sunglasses at the beach and smiling" --output "/path"

// Create a boilerplate for finetune model training
npx @conducolabs/bfl-cli init-finetune --triggerWord "Astronaut" --output "/path"

// Start training of a finetune model
npx @conducolabs/bfl-cli generate-finetune --apiKey "YOUR API KEY" --name "Astronaut" --trainingData "/path" --configurationFile "/path/config.json"

// Get help
npx @conducolabs/bfl-cli --help
npx @conducolabs/bfl-cli generate-image --help
npx @conducolabs/bfl-cli init-finetune --help
npx @conducolabs/bfl-cli generate-finetune --help
```

## Available models & tools
| Model          | Tools                                                                                                                                                     | Finetuning available? |
|----------------|-----------------------------------------------------------------------------------------------------------------------------------------------------------|-----------------------|
| `flux-dev`     | -                                                                                                                                                         | ❌                     |
| `flux-pro`     | <ul><li>default (No tools applied)</li> <li>fill (Using a binary mask)</li> <li>canny (Using a canny mask)</li> <li>depth (Using a depth mask)</li> </ul> | ✅ (For all tools)     |
| `flux-pro 1.1` | <ul><li>default (No tools applied)</li><li> ultra</li></ul>                                                                                               | ✅ (For all tools)     |

## Advanced
The examples show a basic usage of the CLI. There are optional parameters, that can be passed to the functions. If you want to use your own configuration for image generation, please provide your configuration as a JSON file through the `--configurationFile` attribute. Allowed values vary from model to model. A full list of all available values can be found in the [API description](https://api.us1.bfl.ai/scalar) of Black Forest Labs.

You can also use this CLI to generate images that uses a finetuning model. Add `--finetune` to your call and provide the ID of your finetuning model. You can alternatively provide `"select"` as a value. In this case, you can chose from one of your existing models. As of now, finetuning is available for `flux-pro` and `flux-pro 1.1`.