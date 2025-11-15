export class ApiResponse {
  constructor(
    statusCode = 200,
    data = null,
    message = "Request Successful",
    success = null,
    error = ""
  ) {
    this.data = data;
    this.message = message;
    this.success = success;
    this.statusCode = statusCode;
    this.error = error;
    if(Array.isArray(data)){
        this.count = data.length;
    }
  }

  // Success Handler
  static success(
    res,
    data = null,
    message = "Request Successful",
    statusCode = 200
  ) {
    const response = new ApiResponse(statusCode, data, message, true, "");
    return res.status(statusCode).json(response);
  }

  // Error Handler
  static error(
    res,
    message = "Something Went Wrong",
    statusCode = 500,
    error = ""
  ) {
    const response = new ApiResponse(statusCode, null, message, false, error);
    return res.status(statusCode).json(response);
  }
}
