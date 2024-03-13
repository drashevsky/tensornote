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
        if (e.key == "Enter" && text != "") {
            e.preventDefault();
            clearTimeout(debounce);
            dispatch('inputbarupdate', {text, submit: true});
            text = "";
        } else if (e.key == "Escape") {
            (e.target as HTMLElement).blur();
        } else if (e.key == "Tab") {
            e.preventDefault();
            document.getElementById("cursor")?.focus();
        }
    }

    $: text && inputBarUpdated();   // this line doesn't fire when the whole textbox is emptied
    $: word_count = text.split(/\s+/).length;
</script>

<div class="fixed bottom-0 w-full h-[20%]">
    <textarea id="input-bar" class="w-full h-full resize-none" 
        placeholder="Type or search for a note." 
        bind:value={text}
        on:keydown={handleKey}/>
    <div class="absolute bottom-0 right-1 {word_count > tokenLimit ? 
        "text-red-600" : 
        "text-black/75"}">
        {word_count} / {tokenLimit} {word_count > tokenLimit ? "Cursor accuracy loss" : ""} 
    </div>
</div>