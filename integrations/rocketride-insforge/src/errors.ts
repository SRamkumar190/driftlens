export class InsForgeConfigurationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "InsForgeConfigurationError";
  }
}

export class InvestigationValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "InvestigationValidationError";
  }
}

export class IntentProfileStorageError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "IntentProfileStorageError";
  }
}

export class InvestigationStorageError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "InvestigationStorageError";
  }
}

export class InsForgeResponseError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "InsForgeResponseError";
  }
}
