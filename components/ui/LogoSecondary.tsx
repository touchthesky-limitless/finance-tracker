export default function LogoSecondary() {
	return (
		<div className="shrink-0 flex items-center justify-center">
			<svg
				width="28"
				height="28"
				viewBox="0 0 24 24"
				fill="none"
				xmlns="http://www.w3.org/2000/svg"
				role="img"
				aria-label="Financial budget app logo"
			>
				<defs>
					<linearGradient
						id="accent"
						x1="5"
						y1="18"
						x2="19"
						y2="5"
						gradientUnits="userSpaceOnUse"
					>
						<stop stop-color="#34D399" />
						<stop offset="1" stop-color="#60A5FA" />
					</linearGradient>

					<linearGradient
						id="bars"
						x1="8"
						y1="17"
						x2="16"
						y2="8"
						gradientUnits="userSpaceOnUse"
					>
						<stop stop-color="#D1FAE5" />
						<stop offset="1" stop-color="#93C5FD" />
					</linearGradient>
				</defs>

				<path
					d="M7.4 16.5C5.9 15.1 5.1 13 5.3 11C5.6 7.8 8.1 5.4 11.2 5.2"
					stroke="url(#accent)"
					stroke-width="1.4"
					stroke-linecap="round"
				/>
				<path
					d="M12.7 5.2C15.2 5.5 17.3 7.2 18.1 9.6"
					stroke="url(#accent)"
					stroke-width="1.4"
					stroke-linecap="round"
				/>

				<rect x="8" y="13" width="2" height="4" rx="1" fill="url(#bars)" />
				<rect x="11" y="10.8" width="2" height="6.2" rx="1" fill="url(#bars)" />
				<rect x="14" y="8.5" width="2" height="8.5" rx="1" fill="url(#bars)" />

				<path
					d="M7.7 18.2H16.3"
					stroke="#94A3B8"
					stroke-opacity="0.55"
					stroke-width="0.7"
					stroke-linecap="round"
				/>

				<circle cx="17.6" cy="8.1" r="2.35" fill="#0F172A" />
				<circle
					cx="17.6"
					cy="8.1"
					r="2.35"
					stroke="url(#accent)"
					stroke-width="0.75"
				/>
				<path
					d="M16.6 8.1L17.3 8.8L18.6 7.4"
					stroke="#F8FAFC"
					stroke-width="0.8"
					stroke-linecap="round"
					stroke-linejoin="round"
				/>
			</svg>
		</div>
	);
}
