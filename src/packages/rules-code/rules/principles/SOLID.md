# SOLID

## S — Single Responsibility Principle (SRP)

A unit of code (namespace, class, or function) should have only one well-defined responsibility.

### Benefits of SRP

- It makes the code more modular, making it easier to make modifications and additions later on.
- Troubleshooting and issue resolution are simplified as each class focuses on a single responsibility.
- Code reusability is promoted, as specialized classes can be used in different parts of the system.

### Example of SRP

Take the example of a library management application. By applying SRP, we can have a separate class for book management, another for users, and another for transactions. Each class will have its own responsibility, making the code clearer and more maintainable.

## O — Open/Closed Principle (OCP)

Open for extension but closed for modification. When new features need to be added, it is better to extend the existing code rather than directly modifying it.

This is accomplished by using mechanisms such as inheritance, composition, polymorphism, and inversion of control.

### Benefits of OCP

- Code remains stable and avoids regressions even when extended with new features.
- Facilitates unit testing, as existing features are not altered when introducing new ones.

### Example of OCP

In a payment processing application, we can have a generic abstract class for payment methods, such as "PaymentMethod." Each specific payment method (e.g., credit card, PayPal) can then be implemented by extending this abstract class while retaining the basic functionalities common to all payment methods.

## L — Liskov Substitution Principle (LSP)

Highlights the importance of adhering to contracts when inheriting classes. Specifically, if a class B is a subclass of class A, then it should be able to be used as a replacement for A without affecting the system's overall consistency.

### Benefits of LSP

- the ability to substitute objects of subclasses for objects of base classes without altering the overall behavior of the system ensures consistency and avoids surprises or unexpected behaviors when using inheritance or composition.

### Example of LSP

Consider a hierarchy of classes for geometric shapes. If we have a base class "Shape" with specific subclasses such as "Circle" and "Rectangle," LSP requires that instances of "Circle" and "Rectangle" can be used wherever an instance of "Shape" is expected without altering the expected behavior.

## I — Interface Segregation Principle (ISP)

Advocates for defining specific interfaces for clients rather than having a monolithic interface.

### Benefits of ISP

- Makes interfaces clearer and more coherent as they only contain the necessary methods for a specific client.
- Facilitates maintenance, as changes to an interface do not affect all clients but only those using the relevant methods.

### Example of ISP

In an e-commerce application, we can have a separate interface for online payment methods and another for offline payment methods. This way, classes handling online payments only implement the relevant methods for online payments, and vice versa.

## D — Dependency Inversion Principle (DIP)

The use of abstract dependencies rather than relying on concrete classes.

### Benefits of DIP

- Promote better separation of responsibilities and a more flexible and scalable design.
- Facilitates unit testing, as dependencies can be easily mocked or injected during tests.

### Example of DIP

Instead of a high-level class directly depending on a low-level class, we can introduce an abstract interface between the two. This way, the high-level class depends on the interface rather than the concrete class, allowing for easier substitutions.
