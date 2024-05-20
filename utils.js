const commify = (number, decimals = undefined) => {
    if (number === undefined) return "";
    
    let numStr = number.toString();
    let [integerPart, decimalPart] = numStr.split(".");
  
    // Apply thousand separators to the integer part
    integerPart = integerPart.replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  
    // Process the decimal part based on the 'decimals' parameter
    if (decimalPart && decimals !== undefined) {
        decimalPart = decimalPart.slice(0, decimals);
        // Ensure the decimal part fills out to the specified precision
        while (decimalPart.length < decimals) {
            decimalPart += '0'; // Pad with zeros if not enough digits after slicing
        }
    } else if (decimals !== undefined && decimals > 0) {
        decimalPart = "".padEnd(decimals, '0'); // Pad if no decimal part exists
    }
  
    return decimalPart ? `${integerPart}.${decimalPart}` : integerPart;
  }
  
  function formatNumber(num) {
      if (typeof num !== "number") {
          console.error("Input must be a number.");
          return null; // Ensure input is a number
      }
  
      if (num < 1000) {
          return num.toString(); // Convert the number to string for consistency
      }
  
      const units = ["K", "M", "B", "T"]; // Units for thousand, million, billion, trillion
      let unitIndex = -1; // To determine the right unit
      let scaledNum = num;
  
      while (scaledNum >= 1000 && unitIndex < units.length - 1) {
          scaledNum /= 1000; // Divide by 1000 until we find the appropriate unit
          unitIndex++;
      }
  
      // Formatting the number to one decimal place
      return `${scaledNum.toFixed(1)}${units[unitIndex]}`;
  }

module.exports = { commify, formatNumber };