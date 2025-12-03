# LearnWithNisal Practice Server

Simple Node/Express server that forwards transcripts to Google Generative Language (Gemini) and returns compact JSON feedback for spoken-English practice.

## Environment variables
- `GEMINI_API_KEY` (required)
- `GEMINI_MODEL` (optional, default `gemini-1.5-pro`)
- `GEMINI_AUTH_TYPE` either `key` (default) or `bearer`
- `PORT` (optional)

If your Gemini credential requires Bearer token, set `GEMINI_AUTH_TYPE=bearer`.

## Start
