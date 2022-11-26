import {
  buildMessage,
  registerDecorator,
  ValidationOptions,
} from 'class-validator';

export function IsInFuture(validationOptions?: ValidationOptions) {
  return function (object: unknown, propertyName: string) {
    registerDecorator({
      name: 'IsInFuture',
      target: object.constructor,
      propertyName: propertyName,
      options: validationOptions,
      validator: {
        validate(value: any) {
          const now = new Date(new Date().getTime() - 15000);
          // now - 15.seconds
          return value ? value > now : true;
        },
        defaultMessage: buildMessage(
          (eachPrefix) => eachPrefix + '$property should be in the future',
          validationOptions,
        ),
      },
    });
  };
}
