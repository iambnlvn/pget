export class NetworkError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "NetworkError";
  }
}

export class PackageNotFoundError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "PackageNotFoundError";
  }
}
