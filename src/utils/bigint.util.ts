// Enable BigInt JSON serialization across the application
(BigInt.prototype as any).toJSON = function () {
  return this.toString();
};

export const serializeBigInt = <T>(obj: T): T => {
  return JSON.parse(
    JSON.stringify(obj, (_, value) =>
      typeof value === 'bigint' ? value.toString() : value
    )
  );
};
