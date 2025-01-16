import { Plugin } from "obsidian";

export interface WhisperSettings {
	apiKey: string;
	apiUrl: string;
	model: string;
	prompt: string;
	language: string;
	saveAudioFile: boolean;
	saveAudioFilePath: string;
	debugMode: boolean;
	createNewFileAfterRecording: boolean;
	createNewFileAfterRecordingPath: string;
	chatGPTPrompt: string;
	prependTimestamp: boolean; // New toggle for timestamps
	timestampFormat: string; // New format string for timestamps
}

export const DEFAULT_SETTINGS: WhisperSettings = {
	apiKey: "",
	apiUrl: "https://api.openai.com/v1/audio/transcriptions",
	model: "whisper-1",
	prompt: "",
	language: "en",
	saveAudioFile: true,
	saveAudioFilePath: "",
	debugMode: false,
	createNewFileAfterRecording: true,
	createNewFileAfterRecordingPath: "",
	chatGPTPrompt: "Echo back the text I provide with corrections only for spelling, grammar, punctuation, syntax, and paragraph structure. If voice-to-text errors are present, replace incorrect words or phrases with the most likely correct ones, documenting these changes under an “ASSUMPTIONS” section. Preserve the original meaning and structure without paraphrasing or omitting any parts.  There might be corrective instructions in the transcription text given by the speaker; follow it as best as possible documenting your assumptions about the corrective actions. Document all edits for transparency. Always include all parts of the text, verifying completeness in the “ASSUMPTIONS” section.  Again; add paragraph structure so it looks nice and not like a giant wall of text; make minor corrections if needed to make it work!!!\nThe transcription text follows:\n\n{transcribedText}",
	prependTimestamp: false, // Default: off
  	timestampFormat: "YYYY-MM-DD HH:mm:ss", // Default format
};

export class SettingsManager {
	private plugin: Plugin;

	constructor(plugin: Plugin) {
		this.plugin = plugin;
	}

	async loadSettings(): Promise<WhisperSettings> {
		return Object.assign(
			{},
			DEFAULT_SETTINGS,
			await this.plugin.loadData()
		);
	}

	async saveSettings(settings: WhisperSettings): Promise<void> {
		await this.plugin.saveData(settings);
	}
}
