# ChatAndReact

Framework agnostic TypeScript package that can customized and used to gather data from a User via chat interface.  The package caller is responsible for supplying the chat schema, handling inputs, and saving any data obtained from the user.

## Customization

- Chat Schema that outlines questions, inputs, and branching logic.  The schema should match a specific JSON format, but it can be provided in various means using an InputAdapter.  InputAdapters should be written for transforming other data sources into the matching JSON format.  The default Adapter should be
- The Form Builder will output the data using a standard set of classes, which can be overwritten to customize the look and feel of the Form.
- The Web Designer should also be able to write ErrorLogAdapters for piping Errors to various places such as Log File, SQL Database, NoSQL Database, Web Hook, and AWS.  The default ErrorLogAdapter should be for capturing any errors and outputting them to a Log file.
- Additional options:  UserResumable (boolean), LocalStorage (boolean), AutoComplete (boolean)

## Input

- The Chat Interface should allow for entering single-line, multi-line, dropdown-style, checkbox-style, and radio-style inputs.
- Regardless of Input type, the Inputs should fit into the chat interface aesthetic rather than appearing like separate UI elements on the page.
- A User should have a unique session, which is stored in LocalStorage, that will be submitted with any Events of Emits.
- Progress should be able to be resumed unless UserResumable is FALSE.
- If LocalStorage is TRUE, inputs should be saved using LocalStorage in the Browser.
- If AutoComplete is FALSE, all input fields should have AutoComplete set to Off.

## Output

- There should be events for each Page of form inputs submitted that can be used for incremental saves of data unless UserResumable is FALSE.
- At the end of the Form(i.e. no further inputs needed), there should be a final event that allows for saving package caller to save the data.
- If easily done, we might consider allow for creating and using OutputAdapters that allow for additional means of notification such as Webhooks, Web Sockets, and/or Event Emitter with the default OutputAdapter being BrowserEvent.

## License

Apache 2.0 © 2026 Richard McQuiston — see [LICENSE](LICENSE).
