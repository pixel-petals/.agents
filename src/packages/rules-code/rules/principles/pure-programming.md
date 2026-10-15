# Pure Programming

- **Clear Naming.** A class or function should never do more than its name suggests.
  - similarly, a file which exports members, should not execute code upon being imported.

- **Pure Functions.** Functions that always give the exact same output for the same input and do not cause side effects like changing global variables, printing text, or saving to a database.

- **Immutability.** Data cannot be modified after it is created. To update a value, you create a brand-new copy with the updated change instead of overwriting the old data.

- **Statelessness.** Programs do not keep a running track of changing states across different parts of the code. Every action is independent and relies only on the data explicitly passed into it.
  - Where state must be held, methods that only *read* it stay pure — free to return, compose, and be called anywhere.
  - Reserve writes for methods whose purpose *is* the notification, and keep those at the boundary. A method that both reads state and writes it is the one to look at twice.
