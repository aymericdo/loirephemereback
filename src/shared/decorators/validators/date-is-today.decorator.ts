import {
  buildMessage,
  registerDecorator,
  ValidationOptions,
} from 'class-validator';
import { nowInTimezone } from 'src/shared/helpers/date';

export function IsToday(validationOptions?: ValidationOptions) {
  return function (object: unknown, propertyName: string) {
    registerDecorator({
      name: 'IsToday',
      target: object.constructor,
      propertyName: propertyName,
      options: validationOptions,
      validator: {
        validate(value: Date) {
          const yesterday = nowInTimezone();
          yesterday.setDate(yesterday.getDate() - 1);
          const tomorrow = nowInTimezone();
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
