export class ApiResponse {
  constructor(
    data = null,
    message = "Request Successful",
    success = true,
    statusCode = 200,
    errors = []
  ) {
    this.data = data;
    this.message = message;
    this.success = success;
    this.statusCode = statusCode;
    this.errors = errors;
  }
}