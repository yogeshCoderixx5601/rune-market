import { Model, Types } from "mongoose";

interface FinalQuery {
  find: Record<string, any>;
  where: Record<string, any>;
  sort: Record<string, number>;
  start: number;
  limit: number;
  show: string;
  match: string;
}

/**
 * Processes the 'tags' parameter and updates the find query object to match the tag logic.
 * If the 'domain' tag is present, sets `domain_name` to the value of the `content` key.
 * @param finalQuery The final query object being constructed.
 * @param tagsValue The tags string that will be processed.
 * @param contentValue The value of the content key, if available.
 */
function processTagsParam(
  finalQuery: FinalQuery,
  tagsValue: string,
  contentValue?: string
): void {
  console.debug(`Processing tags parameter: ${tagsValue}`); // Log the input tagsValue for debugging

  // Check if the tag is using the 'or' operator
  if (tagsValue.includes("|")) {
    const tags = tagsValue.split("|").filter(Boolean); // Split the tags by the '|' operator and remove any empty strings
    finalQuery.find.$or = tags.map((tag) => ({ tags: tag }));

    // If 'domain' is one of the tags and content value is provided, set domain_name to contentValue
    if (tags.includes("domain") && contentValue) {
      finalQuery.find.domain_name = contentValue;
      finalQuery.find.version = 1;
    }
  }
  // Check if the tag is using the 'and' operator
  else if (tagsValue.includes("&")) {
    const tags = tagsValue.split("&").filter(Boolean); // Split the tags by the '&' operator and remove any empty strings
    finalQuery.find.$and = tags.map((tag) => ({ tags: tag }));

    // If 'domain' is one of the tags and content value is provided, set domain_name to contentValue
    if (tags.includes("domain") && contentValue) {
      finalQuery.find.domain_name = contentValue;
      finalQuery.find.version = 1;
    }
  }
  // If no operator is found, treat it as a single tag
  else {
    finalQuery.find.tags = tagsValue;

    // If the tag is 'domain' and content value is provided, set domain_name to contentValue
    if (tagsValue === "domain" && contentValue) {
      finalQuery.find.domain_name = contentValue;
      finalQuery.find.version = 1;
    }
  }

  console.debug(
    `Updated finalQuery.find with tags: ${JSON.stringify(
      finalQuery.find.$or || finalQuery.find.$and || finalQuery.find.tags
    )}`
  );
  // Log the outcome of the tags parameter process
}

/**
 * This function processes the sorting parameters and updates the query object accordingly.
 * @param finalQuery The final query object that is being constructed.
 * @param sortParam The sorting parameter obtained from the URL.
 */
function processSortParam(finalQuery: FinalQuery, sortParam: string): void {
  console.debug("Processing sort parameter along:", sortParam); // Log the input sortParam for debugging
  const [sortField, sortOrder] = sortParam.split(":");

  // Add sort order to the finalQuery
  finalQuery.sort[sortField] = sortOrder === "-1" ? -1 : 1;

  // Ensure the sort field exists in the documents
  // Add a condition to the query to filter out documents where the sort field does not exist
  // finalQuery.find[sortField] = { $exists: true, $ne: null };

  console.debug(
    `Updated finalQuery.sort with field: ${sortField}, order: ${finalQuery.sort[sortField]}` +
      ` and added existence check for ${sortField} in finalQuery.find`
  ); // Log the outcome of the sorting process and the existence check
}

/**
 * Processes 'where' parameters by checking against the model's schema keys.
 * Adds a query condition to the find object in the final query.
 * Handles special cases like object IDs and regular expressions.
 * @param finalQuery The final query object being constructed.
 * @param model The mongoose model to reference schema keys.
 * @param key The current key in the query parameters.
 * @param value The value associated with the key.
 */
function processWhereParam(
  finalQuery: FinalQuery,
  model: Model<any>,
  key: string,
  value: any,
  params: any
): void {
  console.debug(`Processing where parameter: key=${key}, value=${value}`); // Log the key-value being processed
  const schema = model.schema;
  const schemaKeys = Object.keys(schema.obj);

  if (key === "content" || key === "search") {
    if (finalQuery.find["domain_name"] && finalQuery.find["version"] == 1) {
      console.debug(
        `Skipping 'content' as 'domain_name' and 'version=1' conditions are present`
      );
      return;
    }

    console.debug(`Performing a text search for: ${value}`);
    // MongoDB expects the $text operator with the $search field for text searches.
    finalQuery.find.$text = { $search: `\"${value}\"` };
  } else if (key === "type") {
    switch (value) {
      case "address":
        finalQuery.find.address = params.q;
        break;
      case "rarity":
        finalQuery.find.rarity = params.q;
        break;
      case "sha":
        finalQuery.find.sha = params.q;
        break;
      case "content":
        finalQuery.find.$text = { $search: `\"${params.q}\"` };
        break;
      case "content-type":
        const tags = params.q.split("|").map((tag: string) => tag.trim()); // Split the string and trim each tag
        finalQuery.find.$or = tags.map((tag: string) => ({ tags: tag }));
        break;

      case "bitmap":
        // finalQuery.find.tags = "bitmap";
        finalQuery.find.tags = { $in: "bitmap" };
        finalQuery.find.$text = { $search: `\"${params.q}\"` };
        finalQuery.find.content_type = "text/plain;charset=utf-8";
        break;
      case "domain":
        finalQuery.find.domain_name = params.q;
        finalQuery.find.tags = { $in: "domain" };
        break;
      case "txid":
        finalQuery.find.$or = [
          { txid: params.q },
          { genesis_transaction: params.q },
        ];
        break;
    }
  } else if (schemaKeys.includes(key)) {
    const isObjectId = schema.path(key) instanceof Types.ObjectId;
    if (isObjectId) {
      // Cast to ObjectId if the schema type is ObjectId
      finalQuery.find[key] = new Types.ObjectId(value);
    } else if (key === "type") {
      // Check if 'type' should search within 'tags' array
      finalQuery.find["tags"] = { $in: [new RegExp(value, "i")] };
    } else if (key === "attributes") {
      console.log("setting attributes");
      // Handle attribute search based on value
      finalQuery.find["attributes.value"] = new RegExp(value, "i"); // 'i' for case-insensitive
    } else {
      // Use regular expression for string matching if needed
      finalQuery.find[key] = key === "name" ? new RegExp(value, "i") : value;
    }
  } else {
    // Handle the keys with special query options like '_ne', '_lt', etc.
    processWhereParamWithOptions(finalQuery, key, value);
  }
  console.debug(
    `Updated finalQuery.find with key: ${key}, value: ${finalQuery.find[key]}`
  ); // Log the outcome of the where parameter process
}

/**
 * Processes numerical range parameters (min and max) and adds them to the query.
 * @param finalQuery The final query object being constructed.
 * @param params The parameters object that may contain minNumber or maxNumber.
 */
function processNumberRangeParams(
  finalQuery: FinalQuery,
  params: Record<string, any>
): void {
  Object.keys(params).forEach((paramKey) => {
    const match = paramKey.match(/^(min|max)([A-Z].*)$/);
    if (match) {
      const [, minOrMax, fieldCap] = match;
      const fieldName = fieldCap.charAt(0).toLowerCase() + fieldCap.slice(1);
      if (!finalQuery.find[fieldName]) {
        finalQuery.find[fieldName] = {};
      }
      const operator = minOrMax === "min" ? "$gte" : "$lte";
      finalQuery.find[fieldName][operator] = parseInt(params[paramKey], 10);
    }
  });
}

/**
 * Processes where parameters that include options and updates the query.
 * @param finalQuery The final query object being constructed.
 * @param key The key which might contain a query option.
 * @param value The value to be used for the query.
 */
function processWhereParamWithOptions(
  finalQuery: FinalQuery,
  key: string,
  value: any
): void {
  console.debug(
    `Processing where parameter with options: key=${key}, value=${value}`
  ); // Log the key-value being processed with options

  const queryOptions = ["_ne", "_lt", "_gt", "_lte", "_gte"];

  queryOptions.forEach((option) => {
    if (key.includes(option)) {
      const mongoOperator = `$${option.substring(1)}`;
      const field = key.replace(option, "");

      if (!finalQuery.find[field]) {
        finalQuery.find[field] = {};
      }

      finalQuery.find[field][mongoOperator] = value;
    }
  });
}

/**
 * Converts URL search parameters to a Mongoose query object.
 * @param model The Mongoose model to which the query will be applied.
 * @param nextUrl The URL object that contains the search parameters.
 * @returns {FinalQuery} The final query object constructed from the parameters.
 */
export default function convertParams(
  model: Model<any>,
  nextUrl: URL
): FinalQuery {
  console.debug("Converting URL parameters to Mongoose query"); // Initial log statement for conversion function

  const params: Record<string, any> = {};
  nextUrl.searchParams.forEach((value, key) => {
    params[key] = value;
  });

  const finalQuery: FinalQuery = {
    find: {},
    where: {},
    sort: {},
    start: parseInt(params["_start"], 10) || 0,
    limit: parseInt(params["_limit"], 10) || 10,
    show: params["show"] ? params["show"].split(",").join(" ") : "prune",
    match: params["match"] || "exact",
  };

  Object.keys(params).forEach((key) => {
    if (key.includes("_sort")) {
      processSortParam(finalQuery, params[key]);
    } else if (key === "tags") {
      // Check if there's a content parameter to pair with the domain tag
      const contentValue = params["content"] || undefined;
      processTagsParam(finalQuery, params["tags"], contentValue);
    } else {
      processWhereParam(finalQuery, model, key, params[key], params);
    }
  });

  processNumberRangeParams(finalQuery, params);

  console.debug(finalQuery, "Final query before return"); // Log the finalQuery just before returning
  return finalQuery;
}
