/**
 * Validation Library for Wholesale Portal
 * Provides reusable validators for products, customers, and auth endpoints
 */

/**
 * Validate product form data
 * Returns: { valid: true } or { valid: false, errors: { field: "message" } }
 */
function validateProduct(data) {
  const errors = {};

  // name: required, max 255 chars, trim whitespace
  if (!data.name || typeof data.name !== 'string') {
    errors.name = 'Product name is required';
  } else {
    data.name = data.name.trim();
    if (data.name.length === 0) {
      errors.name = 'Product name cannot be empty';
    } else if (data.name.length > 255) {
      errors.name = 'Product name must be 255 characters or less';
    }
  }

  // sku: optional, if provided must be alphanumeric + hyphens only (backend generates if missing)
  if (data.sku !== undefined && data.sku !== null && data.sku !== '') {
    if (typeof data.sku !== 'string') {
      errors.sku = 'SKU must be a valid string';
    } else {
      data.sku = data.sku.trim().toUpperCase();
      if (!/^[A-Z0-9\-]+$/.test(data.sku)) {
        errors.sku = 'SKU must contain only alphanumeric characters and hyphens';
      }
    }
  } else {
    // SKU will be auto-generated on backend if not provided
    data.sku = null;
  }

  // barcode_pack: optional, if provided must be a string up to 100 chars
  if (data.barcode_pack !== undefined && data.barcode_pack !== null && data.barcode_pack !== '') {
    if (typeof data.barcode_pack !== 'string') {
      errors.barcode_pack = 'Barcode (Pack) must be a valid string';
    } else {
      data.barcode_pack = data.barcode_pack.trim();
      if (data.barcode_pack.length > 100) {
        errors.barcode_pack = 'Barcode (Pack) must be 100 characters or less';
      }
    }
  } else {
    data.barcode_pack = null;
  }

  // barcode_bundle: optional, if provided must be a string up to 100 chars
  if (data.barcode_bundle !== undefined && data.barcode_bundle !== null && data.barcode_bundle !== '') {
    if (typeof data.barcode_bundle !== 'string') {
      errors.barcode_bundle = 'Barcode (Bundle) must be a valid string';
    } else {
      data.barcode_bundle = data.barcode_bundle.trim();
      if (data.barcode_bundle.length > 100) {
        errors.barcode_bundle = 'Barcode (Bundle) must be 100 characters or less';
      }
    }
  } else {
    data.barcode_bundle = null;
  }

  // barcode_box: optional, if provided must be a string up to 100 chars
  if (data.barcode_box !== undefined && data.barcode_box !== null && data.barcode_box !== '') {
    if (typeof data.barcode_box !== 'string') {
      errors.barcode_box = 'Barcode (Box) must be a valid string';
    } else {
      data.barcode_box = data.barcode_box.trim();
      if (data.barcode_box.length > 100) {
        errors.barcode_box = 'Barcode (Box) must be 100 characters or less';
      }
    }
  } else {
    data.barcode_box = null;
  }

  // price: optional if not updating, but if provided must be valid
  if (data.price !== undefined && data.price !== null && data.price !== '') {
    const price = parseFloat(data.price);
    if (isNaN(price)) {
      errors.price = 'Price must be a valid number';
    } else if (price < 0.01) {
      errors.price = 'Price must be at least 0.01';
    } else if (price > 999999.99) {
      errors.price = 'Price cannot exceed 999999.99';
    } else if (!/^\d+(\.\d{1,2})?$/.test(String(data.price))) {
      errors.price = 'Price must have at most 2 decimal places';
    }
  }

  // weight: optional, but if provided must be numeric and positive
  if (data.weight !== undefined && data.weight !== null && data.weight !== '') {
    const weight = parseFloat(data.weight);
    if (isNaN(weight)) {
      errors.weight = 'Weight must be a valid number';
    } else if (weight < 0) {
      errors.weight = 'Weight must be zero or positive';
    }
  }

  // bags_per_case: optional, but if provided must be positive integer
  if (data.bags_per_case !== undefined && data.bags_per_case !== null && data.bags_per_case !== '') {
    const bags = parseInt(data.bags_per_case, 10);
    if (isNaN(bags) || bags < 1) {
      errors.bags_per_case = 'Bags per case must be a positive integer';
    }
  } else {
    // Treat empty string/null as null for backend
    data.bags_per_case = null;
  }

  // cases_per_pallet: optional, but if provided must be positive integer >= 1
  if (data.cases_per_pallet !== undefined && data.cases_per_pallet !== null && data.cases_per_pallet !== '') {
    const cases = parseInt(data.cases_per_pallet, 10);
    if (isNaN(cases) || cases < 1) {
      errors.cases_per_pallet = 'Cases per pallet must be a positive integer (at least 1)';
    }
  } else {
    // Treat empty string/null as null for backend
    data.cases_per_pallet = null;
  }

  // category_id: required, must be numeric (DB will enforce existence)
  if (!data.category_id) {
    errors.category_id = 'Category is required';
  } else if (isNaN(parseInt(data.category_id, 10))) {
    errors.category_id = 'Category must be a valid ID';
  }

  // super_category_id: optional, but if provided must be numeric
  if (data.super_category_id !== undefined && data.super_category_id !== null) {
    if (isNaN(parseInt(data.super_category_id, 10))) {
      errors.super_category_id = 'Super category must be a valid ID';
    }
  }

  // box_image_url: optional, string, max 512 chars
  if (data.box_image_url !== undefined && data.box_image_url !== null && data.box_image_url !== '') {
    if (typeof data.box_image_url !== 'string') {
      errors.box_image_url = 'Box Image URL must be a valid string';
    } else if (data.box_image_url.trim().length > 512) {
      errors.box_image_url = 'Box Image URL must be 512 characters or less';
    }
  } else {
    data.box_image_url = null;
  }

  // bundle_image_url: optional, string, max 512 chars
  if (data.bundle_image_url !== undefined && data.bundle_image_url !== null && data.bundle_image_url !== '') {
    if (typeof data.bundle_image_url !== 'string') {
      errors.bundle_image_url = 'Bundle Image URL must be a valid string';
    } else if (data.bundle_image_url.trim().length > 512) {
      errors.bundle_image_url = 'Bundle Image URL must be 512 characters or less';
    }
  } else {
    data.bundle_image_url = null;
  }

  // image_url: optional, but if provided must be valid URL or relative path
  if (data.image_url !== undefined && data.image_url !== null && data.image_url !== '') {
    // Accept both absolute URLs and relative paths (e.g., /uploads/products/filename.jpg)
    if (typeof data.image_url !== 'string') {
      errors.image_url = 'Image URL must be a valid string';
    } else if (data.image_url.trim().length === 0) {
      errors.image_url = 'Image URL cannot be empty';
    } else {
      // Validate it's either a relative path starting with / or a valid absolute URL
      if (!data.image_url.startsWith('/')) {
        try {
          new URL(data.image_url);
        } catch (e) {
          errors.image_url = 'Image URL must be a valid URL or relative path';
        }
      }
    }
  }

  return {
    valid: Object.keys(errors).length === 0,
    errors
  };
}

/**
 * Validate customer form data
 * Returns: { valid: true } or { valid: false, errors: { field: "message" } }
 */
function validateCustomer(data) {
  const errors = {};

  // email: required, valid format, unique (DB will enforce), trimmed lowercase
  if (!data.email || typeof data.email !== 'string') {
    errors.email = 'Email is required';
  } else {
    data.email = data.email.trim().toLowerCase();
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(data.email)) {
      errors.email = 'Email must be a valid email address';
    }
  }

  // company_name: required, max 255, trim whitespace
  if (!data.company_name || typeof data.company_name !== 'string') {
    errors.company_name = 'Company name is required';
  } else {
    data.company_name = data.company_name.trim();
    if (data.company_name.length === 0) {
      errors.company_name = 'Company name cannot be empty';
    } else if (data.company_name.length > 255) {
      errors.company_name = 'Company name must be 255 characters or less';
    }
  }

  // contact_name: optional, but if provided max 255
  if (data.contact_name !== undefined && data.contact_name !== null && data.contact_name !== '') {
    if (typeof data.contact_name === 'string') {
      data.contact_name = data.contact_name.trim();
      if (data.contact_name.length > 255) {
        errors.contact_name = 'Contact name must be 255 characters or less';
      }
    }
  }

  // phone: optional, but if provided must be 10-15 digits
  if (data.phone !== undefined && data.phone !== null && data.phone !== '') {
    if (typeof data.phone !== 'string') {
      errors.phone = 'Phone must be a valid string';
    } else {
      const digits = data.phone.replace(/\D/g, '');
      if (digits.length < 10 || digits.length > 15) {
        errors.phone = 'Phone must contain 10-15 digits';
      }
    }
  }

  // address: optional, max 500 chars
  if (data.address !== undefined && data.address !== null && data.address !== '') {
    if (typeof data.address !== 'string') {
      errors.address = 'Address must be a valid string';
    } else if (data.address.length > 500) {
      errors.address = 'Address must be 500 characters or less';
    }
  }

  // city, state, zip: optional, reasonable length limits
  if (data.city !== undefined && data.city !== null && data.city !== '') {
    if (typeof data.city === 'string' && data.city.length > 100) {
      errors.city = 'City must be 100 characters or less';
    }
  }

  if (data.state !== undefined && data.state !== null && data.state !== '') {
    if (typeof data.state === 'string' && data.state.length > 50) {
      errors.state = 'State must be 50 characters or less';
    }
  }

  if (data.zip !== undefined && data.zip !== null && data.zip !== '') {
    if (typeof data.zip === 'string' && data.zip.length > 20) {
      errors.zip = 'ZIP code must be 20 characters or less';
    }
  }

  return {
    valid: Object.keys(errors).length === 0,
    errors
  };
}

/**
 * Validate login credentials
 * Returns: { valid: true } or { valid: false, errors: { field: "message" } }
 */
function validateLogin(data) {
  const errors = {};

  // email: required, valid format, trimmed lowercase
  if (!data.email || typeof data.email !== 'string') {
    errors.email = 'Email is required';
  } else {
    data.email = data.email.trim().toLowerCase();
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(data.email)) {
      errors.email = 'Email must be a valid email address';
    }
  }

  // password: required, min 8 chars
  if (!data.password || typeof data.password !== 'string') {
    errors.password = 'Password is required';
  } else if (data.password.length < 8) {
    errors.password = 'Password must be at least 8 characters';
  }

  return {
    valid: Object.keys(errors).length === 0,
    errors
  };
}

/**
 * Validate password reset request
 * Returns: { valid: true } or { valid: false, errors: { field: "message" } }
 */
function validateResetPasswordRequest(data) {
  const errors = {};

  if (!data.email || typeof data.email !== 'string') {
    errors.email = 'Email is required';
  } else {
    data.email = data.email.trim().toLowerCase();
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(data.email)) {
      errors.email = 'Email must be a valid email address';
    }
  }

  return {
    valid: Object.keys(errors).length === 0,
    errors
  };
}

/**
 * Validate password reset confirmation
 * Returns: { valid: true } or { valid: false, errors: { field: "message" } }
 */
function validateResetPasswordConfirm(data) {
  const errors = {};

  if (!data.token || typeof data.token !== 'string') {
    errors.token = 'Reset token is required';
  } else if (data.token.length < 32) {
    errors.token = 'Invalid reset token';
  }

  if (!data.new_password || typeof data.new_password !== 'string') {
    errors.new_password = 'New password is required';
  } else if (data.new_password.length < 8) {
    errors.new_password = 'Password must be at least 8 characters';
  }

  return {
    valid: Object.keys(errors).length === 0,
    errors
  };
}

/**
 * Sanitize string input (trim, normalize)
 */
function sanitizeString(str) {
  if (typeof str !== 'string') return str;
  return str.trim();
}

/**
 * Sanitize email (trim, lowercase)
 */
function sanitizeEmail(email) {
  if (typeof email !== 'string') return email;
  return email.trim().toLowerCase();
}

module.exports = {
  validateProduct,
  validateCustomer,
  validateLogin,
  validateResetPasswordRequest,
  validateResetPasswordConfirm,
  sanitizeString,
  sanitizeEmail
};
