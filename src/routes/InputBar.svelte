<script lang="ts">
    import { createEventDispatcher } from 'svelte';

    export let text: string;
    export let tokenLimit: number;
    const dispatch = createEventDispatcher();

    let debounce : NodeJS.Timeout = setTimeout(() => {}, 0); 
    let word_count = 0;

    function inputBarUpdated() {
        
        // Make sure embedding is updated every 125 ms
        clearTimeout(debounce);
        debounce = setTimeout((async (t : string) => {
            if (text == t)
                dispatch('inputbarupdate', {text, submit: false});
        }).bind(null, text), 125);
    }

    function handleKey(e : KeyboardEvent) {
        if (e.key == "Enter" && !e.shiftKey && text.trim() != "") {
            e.preventDefault();
            clearTimeout(debounce);
            dispatch('inputbarupdate', {text, submit: true});
            text = "";
        } else if (e.key == "Escape") {
            (e.target as HTMLElement).blur();
        } else if (e.key == "Tab") {
            let el = document.getElementById("cursor");
            if (el) {
                e.preventDefault();
                el.focus();
            }
        }
    }

    $: text && inputBarUpdated();   // this line doesn't fire when the whole textbox is emptied
    $: word_count = text.split(/\s+/).filter(token => token.length > 0).length;
</script>

<div class="fixed bottom-0 w-full h-[15%] p-3">
    <textarea id="input-bar" 
        class="w-full h-full bg-zinc-50 p-1 border border-gray-500 rounded-md resize-none" 
        placeholder="Space to type or search. Enter to submit. Shift + enter for newline." 
        bind:value={text}
        on:keydown={handleKey}/>
    <div class="absolute bottom-3 right-5 {word_count > tokenLimit ? 
        "text-red-600" : 
        "text-black/75"}">
        {word_count} / {tokenLimit} {word_count > tokenLimit ? "Cursor accuracy reduced" : ""} 
    </div>
</div>