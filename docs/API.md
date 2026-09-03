# API

All routes are internal to the app (called by the UI, not meant as a
public API) and only ever reachable on `localhost` — see
[SECURITY.md](../SECURITY.md). Every route accepts/returns JSON except
`/api/export`, which returns a binary file, and `/api/parse-file`, which
accepts `multipart/form-data`.

The `Cv` object referenced below is the shape defined by `cvSchema` in
[`lib/schema.ts`](../lib/schema.ts):

```ts
{
  name: string;
  title: string;
  contact: { email: string; phone: string; location: string; links: string[] };
  summary: string;
  skills: string[];
  experience: { company: string; role: string; dates: string; bullets: string[] }[];
  education: { school: string; degree: string; dates: string }[];
  certifications: string[];
}
```

## `POST /api/generate`

Runs the one LLM call ([`generateTailoredCv`](../lib/llm.ts)) that produces a
tailored `Cv` object from a source CV and a job description.

**Request body**

```ts
{
  cvText: string;
  jobDescription: string;
  model: string;
}
```

`model` must be one of the ids in `CURATED_MODELS` (`lib/models.ts`).
`cvText` and `jobDescription` are each capped at 50,000 characters.

**Responses**

| Status | Body                                                                         | When                                                                                                        |
| ------ | ---------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------- |
| 200    | `{ cv: Cv }`                                                                 | success                                                                                                     |
| 400    | `{ error: "Invalid JSON body" }`                                             | body isn't valid JSON                                                                                       |
| 400    | `{ error: "cvText, jobDescription, and model are all required" }`            | a required field is missing                                                                                 |
| 400    | `{ error: "cvText and jobDescription must each be under 50000 characters" }` | length guard tripped                                                                                        |
| 400    | `{ error: "Unknown model" }`                                                 | `model` isn't in the curated allowlist                                                                      |
| 502    | `{ error: string }`                                                          | Ollama unreachable, or the model's output didn't match the `Cv` schema (message from `friendlyOllamaError`) |

## `GET /api/models`

Lists the curated models with their local install status.

**Responses**

| Status | Body                                                                                           |
| ------ | ---------------------------------------------------------------------------------------------- |
| 200    | `{ models: (ModelOption & { downloaded: boolean })[] }` — see `ModelOption` in `lib/models.ts` |
| 502    | `{ error: string }` — Ollama unreachable                                                       |

## `POST /api/models`

Pulls (downloads) one curated model into Ollama's local store, streaming
progress back as the pull runs.

**Request body**

```ts
{
  model: string;
}
```

**Responses**

| Status | Body                                                                                   | When                                                                        |
| ------ | -------------------------------------------------------------------------------------- | --------------------------------------------------------------------------- |
| 400    | `{ error: "Invalid JSON body" }`                                                       | body isn't valid JSON                                                       |
| 400    | `{ error: "Unknown model" }`                                                           | `model` isn't in the curated allowlist                                      |
| 400    | `{ error: "Not enough disk space to download <label> (~<n>GB needed, ~<n>GB free)." }` | available disk space is under the model's `sizeGb` plus a 1GB safety margin |
| 200    | newline-delimited JSON stream, `Content-Type: application/x-ndjson`                    | valid request                                                               |

Once the stream starts, HTTP status is always 200 (headers are already sent)
— failures mid-pull are reported in-band as a chunk instead. Each line is one
JSON object, either:

- an Ollama pull progress chunk, passed through as-is from `ollama.pull()`
  (Ollama's `ProgressResponse`):

  ```ts
  {
    status: string;
    digest: string;
    total: number;
    completed: number;
  }
  ```

  `status` moves through Ollama's own pull lifecycle strings (e.g.
  `"pulling manifest"`, `"pulling <digest>"`, `"verifying sha256 digest"`,
  `"writing manifest"`, `"success"`); `total`/`completed` are byte counts for
  the layer currently downloading, present once a layer pull is under way.

- or, if the pull fails partway through:

  ```ts
  {
    status: "error";
    error: string;
  }
  ```

If the client disconnects (e.g. the user cancels the download), the request's
`signal` fires and the underlying `ollama.pull()` stream is aborted
server-side — the pull actually stops instead of continuing unseen. This
doesn't change the response shape above.

## `DELETE /api/models`

Deletes a curated model from Ollama's local store.

**Request body**

```ts
{
  model: string;
}
```

**Responses**

| Status | Body                                     | When                                                                               |
| ------ | ---------------------------------------- | ---------------------------------------------------------------------------------- |
| 400    | `{ error: "Invalid JSON body" }`         | body isn't valid JSON                                                              |
| 400    | `{ error: "Unknown model" }`             | `model` isn't in the curated allowlist                                             |
| 404    | `{ error: "<label> isn't downloaded." }` | Ollama reports the model isn't installed                                           |
| 502    | `{ error: string }`                      | Ollama unreachable, or another delete failure (message from `friendlyOllamaError`) |
| 200    | `{ status: "success" }`                  | model deleted                                                                      |

## `POST /api/parse-file`

Extracts plain text from an uploaded PDF or DOCX, entirely locally
(`lib/parseFile.ts`). Used to populate the CV/job-description text boxes from
a file upload — the extracted text, not the file, is what later goes to the
model.

**Request body**: `multipart/form-data` with a `file` field. Only `.pdf` and
`.docx` filenames are accepted; max size 20MB.

**Responses**

| Status | Body                                        | When                                                                                                                                        |
| ------ | ------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------- |
| 200    | `{ text: string }`                          | success                                                                                                                                     |
| 400    | `{ error: "No file provided" }`             | no `file` field, or not a `File`                                                                                                            |
| 413    | `{ error: "File is too large (max 20MB)" }` | file exceeds 20MB                                                                                                                           |
| 422    | `{ error: string }`                         | extraction failed — unsupported extension (message includes the filename) or the file couldn't be parsed (e.g. corrupt/unsupported content) |

## `POST /api/export`

Renders a `Cv` object to a downloadable DOCX or PDF file (the Markdown/plain
text/HTML formats render client-side and never hit this route — see
[docs/ARCHITECTURE.md](./ARCHITECTURE.md)).

**Request body**

```ts
{
  cv: Cv;
  format: "docx" | "pdf";
}
```

`cv` is re-validated server-side against `cvSchema` regardless of what the
client sent.

**Responses**

| Status | Body                                                                                                                                                                                                         | When                                               |
| ------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | -------------------------------------------------- |
| 200    | binary file body, `Content-Type: application/vnd.openxmlformats-officedocument.wordprocessingml.document` (docx) or `application/pdf` (pdf), `Content-Disposition: attachment; filename="<name>.docx\|.pdf"` | success                                            |
| 400    | `{ error: "Invalid JSON body" }`                                                                                                                                                                             | body isn't valid JSON                              |
| 400    | `{ error: "Invalid CV payload" }`                                                                                                                                                                            | `cv` fails `cvSchema` validation                   |
| 400    | `{ error: "format must be 'docx' or 'pdf'" }`                                                                                                                                                                | `format` is missing or not one of those two values |

The download filename is derived from `cv.name` via
`sanitizeFilenameBase` (`lib/filename.ts`), which also guards against
`Content-Disposition` header injection.

## `GET /api/health`

Reports whether the app can reach its local Ollama server. Not used by the
UI — for scripting or monitoring (e.g. `curl localhost:3000/api/health`
before automating a generation request).

**Responses**

| Status | Body                                                                | When                  |
| ------ | ------------------------------------------------------------------- | --------------------- |
| 200    | `{ status: "ok", ollama: "reachable" }`                             | Ollama responded      |
| 503    | `{ status: "degraded", ollama: "unreachable", error: "<message>" }` | Ollama didn't respond |

## `POST /api/cover-letter`

Runs one LLM call ([`generateCoverLetter`](../lib/coverLetter.ts)) that
produces a plain-text cover letter grounded only in the given `Cv` object and
job description — no separate generation of new facts.

**Request body**

```ts
{
  cv: Cv;
  jobDescription: string;
  model: string;
}
```

`cv` is validated against `cvSchema`. `jobDescription` is capped at 50,000
characters. `model` must be one of the ids in `CURATED_MODELS`
(`lib/models.ts`).

**Responses**

| Status | Body                                                         | When                                                    |
| ------ | ------------------------------------------------------------ | ------------------------------------------------------- |
| 200    | `{ letter: string }`                                         | success                                                 |
| 400    | `{ error: "Invalid JSON body" }`                             | body isn't valid JSON                                   |
| 400    | `{ error: "Invalid CV payload" }`                            | `cv` fails `cvSchema` validation                        |
| 400    | `{ error: "jobDescription and model are required" }`         | a required field is missing                             |
| 400    | `{ error: "jobDescription must be under 50000 characters" }` | length guard tripped                                    |
| 400    | `{ error: "Unknown model" }`                                 | `model` isn't in the curated allowlist                  |
| 502    | `{ error: string }`                                          | Ollama unreachable (message from `friendlyOllamaError`) |
