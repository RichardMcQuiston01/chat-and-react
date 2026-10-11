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

## Editing earlier answers

The controller keeps the pages the user has submitted in order. Re-open one to change its answers:

```ts
const route = controller.getRoute(); // [{ pageId, answers }, ...]

controller.reopenPage(0); // returns false if the index is unknown or the form is complete
const questions = controller.getVisibleQuestions(); // the questions for that page
const oldAnswers = controller.getAnswers(); // for pre-filling your inputs

const outcome = controller.submitPage({ full_name: "Ada L." });
// "edit-resumed"  - the route is unchanged; the controller is back on the page you were on
// "edit-rerouted" - the answer changed the route; later pages were dropped
// "advanced"      - a normal submit
```

`page:submit` fires again with `edited: true`.
