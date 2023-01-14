import {
  buildMessage,
  registerDecorator,
  ValidationOptions,
} from 'class-validator';

export function IsToday(validationOptions?: ValidationOptions) {
  return function (object: unknown, propertyName: string) {
    registerDecorator({
      name: 'IsToday',
      target: object.constructor,
      propertyName: propertyName,
      options: validationOptions,
      validator: {
        validate(value: Date) {
          const yesterday = new Date();
          yesterday.setDate(yesterday.getDate() - 1);
          const tomorrow = new Date();
          tomorrow.setDate(tomorrow.getDate() + 1);

          return value <= tomorrow && value >= yesterday;
        },
        defaultMessage: buildMessage(
          (eachPrefix) => eachPrefix + '$property should be today',
          validationOptions,
        ),
      },
    });
  };
}
