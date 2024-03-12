<script lang="ts">
    import { createEventDispatcher } from 'svelte';

    export let text: string;
    const dispatch = createEventDispatcher();
    let debounce : NodeJS.Timeout = setTimeout(() => {}, 0); 

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
</script>

<div class="fixed bottom-0 w-full h-[20%]">
    <textarea id="input-bar" class="w-full h-full" placeholder="Type or search for a note." 
        bind:value={text}
        on:keydown={handleKey}/>
</div>