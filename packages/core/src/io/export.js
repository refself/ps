import { generateCode } from "../codegen";
export const exportWorkflow = ({ document }) => {
    return generateCode(document);
};
