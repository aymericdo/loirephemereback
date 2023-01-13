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
          const today = new Date();
          return (
            value.getDate() === today.getDate() &&
            value.getMonth() === today.getMonth() &&
            value.getFullYear() === today.getFullYear()
          );
        },
        defaultMessage: buildMessage(
          (eachPrefix) => eachPrefix + '$property should be today',
          validationOptions,
        ),
      },
    });
  };
}
