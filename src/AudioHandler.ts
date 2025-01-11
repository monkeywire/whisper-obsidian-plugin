import axios from "axios";
import Whisper from "main";
import moment from "moment";// Import Moment.js for timestamp formatting
import { Notice, MarkdownView } from "obsidian";
import { getBaseFileName } from "./utils";

export class AudioHandler {
    private plugin: Whisper;

    constructor(plugin: Whisper) {
        this.plugin = plugin;
    }

    async sendAudioData(blob: Blob, fileName: string): Promise<void> {
    const baseFileName = getBaseFileName(fileName);

    const audioFilePath = `${
        this.plugin.settings.saveAudioFilePath
            ? `${this.plugin.settings.saveAudioFilePath}/`
            : ""
    }${fileName}`;

    const noteFilePath = `${
        this.plugin.settings.createNewFileAfterRecordingPath
            ? `${this.plugin.settings.createNewFileAfterRecordingPath}/`
            : ""
    }${baseFileName}.md`;

    if (this.plugin.settings.debugMode) {
        new Notice(`Sending audio data size: ${blob.size / 1000} KB`);
    }

    if (!this.plugin.settings.apiKey) {
        new Notice(
            "API key is missing. Please add your API key in the settings."
        );
        return;
    }

    const formData = new FormData();
    formData.append("file", blob, fileName);
    formData.append("model", this.plugin.settings.model);
    formData.append("language", this.plugin.settings.language);
    if (this.plugin.settings.prompt)
        formData.append("prompt", this.plugin.settings.prompt);

    try {
        if (this.plugin.settings.saveAudioFile) {
            const arrayBuffer = await blob.arrayBuffer();
            await this.plugin.app.vault.adapter.writeBinary(
                audioFilePath,
                new Uint8Array(arrayBuffer)
            );
            new Notice("Audio saved successfully.");
        }
    } catch (err) {
        console.error("Error saving audio file:", err);
        new Notice("Error saving audio file: " + err.message);
    }

    try {
        if (this.plugin.settings.debugMode) {
            new Notice("Parsing audio data:" + fileName);
        }

        // Whisper API call
        const response = await axios.post(
            this.plugin.settings.apiUrl,
            formData,
            {
                headers: {
                    "Content-Type": "multipart/form-data",
                    Authorization: `Bearer ${this.plugin.settings.apiKey}`,
                },
            }
        );

        // Extract transcribed text
        const transcribedText = response.data.text;

        // ChatGPT API call for additional processing
        const chatGPTPrompt = this.plugin.settings.chatGPTPrompt.replace(
          "{transcribedText}",
          transcribedText
        );

        const chatGPTResponse = await axios.post(
            "https://api.openai.com/v1/chat/completions",
            {
                model: "gpt-3.5-turbo",
                messages: [{ role: "user", content: chatGPTPrompt }],
            },
            {
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${this.plugin.settings.apiKey}`, // Assuming a separate API key for OpenAI
                },
            }
        );

        // Extract processed text
        let processedText = chatGPTResponse.data.choices[0].message.content;

        // Prepend timestamp if the setting is enabled
        if (this.plugin.settings.prependTimestamp) {
            const timestamp = moment().format(this.plugin.settings.timestampFormat);
            processedText = `${timestamp}\n${processedText}`;
        }

        // Determine where to insert processed text
        const activeView =
            this.plugin.app.workspace.getActiveViewOfType(MarkdownView);
        const shouldCreateNewFile =
            this.plugin.settings.createNewFileAfterRecording || !activeView;

        if (shouldCreateNewFile) {
            await this.plugin.app.vault.create(
                noteFilePath,
                `![[${audioFilePath}]]\n${processedText}`
            );
            await this.plugin.app.workspace.openLinkText(
                noteFilePath,
                "",
                true
            );
        } else {
            const editor =
                this.plugin.app.workspace.getActiveViewOfType(
                    MarkdownView
                )?.editor;
            if (editor) {
                const cursorPosition = editor.getCursor();
                editor.replaceRange(processedText, cursorPosition);

                const newPosition = {
                    line: cursorPosition.line,
                    ch: cursorPosition.ch + processedText.length,
                };
                editor.setCursor(newPosition);
            }
        }

        new Notice("Audio parsed and processed successfully.");
    } catch (err) {
        console.error("Error parsing audio or processing transcription:", err);
        new Notice("Error: " + err.message);
    }
}
}