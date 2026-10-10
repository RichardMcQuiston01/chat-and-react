# Headless Usage

"Headless" means using the form logic with no screen. The `@richardmcquiston01/chat-and-react-core` package works in Node or on a server. It does not need the DOM.

```ts
import {
  ChatController,
  parseSchema,
} from "@richardmcquiston01/chat-and-react-core";

const schema = parseSchema(rawJson);

const controller = new ChatController({ schema });

controller.on("page:submit", (event) => {
  saveToDatabase(event);
});

controller.on("form:complete", (event) => {
  finalizeSubmission(event.allAnswers);
});

controller.start();

const page = controller.getCurrentPage();
const questions = controller.getVisibleQuestions();

// After you collect answers from your own UI:
controller.submitPage({ question_id: "answer value" });
```

To send events or errors somewhere, pass adapters to `ChatController`. See [Custom Adapters](custom-adapters.md) and [Optional Adapters](optional-adapters.md).
