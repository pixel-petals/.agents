# Code Testing

- Test code should respect most, if not all, rules of production code.
- Tests should additionally follow [AAA](#aaa-arrange-act-assert)
- Tests should instill confidence in refactoring, not prevent it.
- Tests should live near the code they are testing.

## AAA (Arrange, Act, Assert)

Tests should be structured in three parts:

- Arrange everything necessary to perform the test.
- Act on the target code to be tested by executing it.
- Assert the expected outcomes.

## Test the Interface, Not Implementation

- Verify what the code achieves, not the specific steps or private helper functions it uses to get there.
- Avoid internal mocks. Do not check if private methods or specific internal functions were called.
- Mocking external dependencies is expected — this is what [DIP](principles/SOLID.md#d--dependency-inversion-principle-dip) enables.
