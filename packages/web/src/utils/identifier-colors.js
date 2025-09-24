const palettes = [
    {
        chip: "border border-[#3A5AE533] bg-[#3A5AE510] hover:border-[#3A5AE5] hover:bg-[#3A5AE520]",
        text: "text-[#3A5AE5]"
    },
    {
        chip: "border border-[#32AA8133] bg-[#32AA8110] hover:border-[#32AA81] hover:bg-[#32AA8120]",
        text: "text-[#267E61]"
    },
    {
        chip: "border border-[#E2A63633] bg-[#E2A63610] hover:border-[#E2A636] hover:bg-[#E2A63620]",
        text: "text-[#B58027]"
    },
    {
        chip: "border border-[#AF54BE33] bg-[#AF54BE10] hover:border-[#AF54BE] hover:bg-[#AF54BE20]",
        text: "text-[#8A4096]"
    },
    {
        chip: "border border-[#578BC933] bg-[#578BC910] hover:border-[#578BC9] hover:bg-[#578BC920]",
        text: "text-[#3B689C]"
    },
    {
        chip: "border border-[#339E8033] bg-[#339E8010] hover:border-[#339E80] hover:bg-[#339E8020]",
        text: "text-[#28765D]"
    },
    {
        chip: "border border-[#CD3A5033] bg-[#CD3A5010] hover:border-[#CD3A50] hover:bg-[#CD3A5020]",
        text: "text-[#A22D3E]"
    },
    {
        chip: "border border-[#65778233] bg-[#65778210] hover:border-[#657782] hover:bg-[#65778220]",
        text: "text-[#465764]"
    }
];
const hashIdentifier = (identifier) => {
    let hash = 0;
    for (let index = 0; index < identifier.length; index += 1) {
        hash = (hash * 31 + identifier.charCodeAt(index)) % 997;
    }
    return hash;
};
export const getIdentifierStyle = (identifier) => {
    if (!identifier) {
        return {
            chip: "border border-[#0A1A2314] bg-[#F5F6F9]",
            text: "text-[#657782]"
        };
    }
    const palette = palettes[hashIdentifier(identifier) % palettes.length];
    return palette;
};
