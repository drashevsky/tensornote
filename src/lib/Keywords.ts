import keyword_extractor from "keyword-extractor";

export function getKeywords(text: string): [string, number][] {
    let keywords = keyword_extractor.extract(simpleTokenize(text).join(" "), {
        language:"english",
        remove_digits: true,
        return_changed_case: true,
        remove_duplicates: false
    });
    return getTermFrequencies(keywords, false);
}

// Given a matrix with arrays of sorted keyword scores, get the top n keywords of the corpus 
// and their scores
export function getTopNKeywords(matrix: [string, number][][], n: number): [string, number][] {
    let keywords: [string, number][] = [];

    let search_idx = 0;
    while (keywords.length < n) {
        let currKeywords = matrix.filter(arr => arr[search_idx] !== undefined)
                                 .map(arr => arr[search_idx]);
        
        if (currKeywords.length > 0) {
            keywords.push(...currKeywords.slice(0, n - keywords.length));
            search_idx++;
        } else {
            break;
        }
    }

    keywords.sort((a, b) => b[1] - a[1]);
    return keywords;
}

// Given an array of word-term frequency pairing arrays (each array = one document), return an 
// array of word-(term freq * inverse document freq) pairing arrays (each array = one document)
// just_idf: return only inverse document frequencies
export function getTfIdf(freq_matrix: [string, number][][], just_idf: boolean): [string, number][][] {

    // First count the number of documents each word appears in
    let docs_per_word = new Map<string, number>();
    for (let freq_arr of freq_matrix) {                         // iterate thru docs
        for (let [word, count] of freq_arr) {                   // iterate thru words
            let count = docs_per_word.get(word);
            docs_per_word.set(word, count ? count + 1 : 1);
        }
    }

    // Generate matrix
    let tfidf_matrix: [string, number][][] = [];
    for (let i = 0; i < freq_matrix.length; i++) {              // iterate thru docs
        let tfidf_arr: [string, number][] = [];
        for (let j = 0; j < freq_matrix[i].length; j++) {       // iterate thru words
            let word = freq_matrix[i][j][0];
            let docs_count = docs_per_word.get(word);
            let idf = (docs_count) ? Math.log10(freq_matrix.length / docs_count) : 0;
            tfidf_arr.push([word, just_idf ? idf : freq_matrix[i][j][1] * idf]);
        }
        tfidf_arr.sort((a, b) => b[1] - a[1]);  // I decided to sort the tfdiff scores
        tfidf_matrix.push(tfidf_arr);
    }
    return tfidf_matrix;
}

// Calculates term frequency of keywords in an array, sort array by term frequency
// just_count: return only the term counts
export function getTermFrequencies(keywords: string[], just_count: boolean): [string, number][] {
    const unit = just_count ? 1 : 1 / keywords.length;
    let freqmap = new Map<string, number>();
    for (let keyword of keywords) {
        let oldfreq = freqmap.get(keyword);
        freqmap.set(keyword, oldfreq ? oldfreq + unit : unit);
    }

    let sortedwords = Array.from(freqmap.entries());
    sortedwords.sort((a, b) => b[1] - a[1]);
    return sortedwords;
}

// Rudimentary tokenization focusing on extracting standalone words with optional underscores
function simpleTokenize(text: string): string[] {
    const regex = /^([a-zA-Z_])+$/gm;
    return text.split(/(\s+)/).filter(token => regex.test(token));
}