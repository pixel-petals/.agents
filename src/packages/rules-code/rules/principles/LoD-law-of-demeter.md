# LoD (Law of Demeter)

Also known as the "Principle of Only Talking to Your Closest Friends."

According to this principle, a class should only interact with its immediate collaborators and not directly access objects it interacts with indirectly.

Likewise, a class should not access internal members or children of other objects (unless provided through a public interface).

## Benefits of LoD

- Reducing the cascading effects of changes.
  - When a class depends only on its immediate collaborators, it becomes less sensitive to internal changes in the objects it interacts with indirectly.
  - This helps reduce the risks of unintended side effects and facilitates the localization and correction of errors.
