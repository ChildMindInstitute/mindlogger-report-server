
export const isFloat = (inputString) => {
    if (Array.isArray(inputString)) {
        return false;
    }
    const parsed = parseFloat(inputString);
    if (Number.isInteger(parsed)) {
        return true;
    }
    return !isNaN(parsed) && parsed === Number(inputString);
}
