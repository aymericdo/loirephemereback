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
          const start = new Date();
          start.setUTCHours(0, 0, 0, 0);

          const end = new Date();
          end.setUTCHours(23, 59, 59, 999);

          // safe fallback
          // const yesterday = new Date();
          // yesterday.setDate(yesterday.getDate() - 1);
          // const tomorrow = new Date();
          // tomorrow.setDate(tomorrow.getDate() + 1);

          return value <= end && value >= start;
        },
        defaultMessage: buildMessage(
          (eachPrefix) => eachPrefix + '$property should be today',
          validationOptions,
        ),
      },
    });
  };
}
