interface LogoProps {
	size?: number | string;
}

// Increased default size from 28 to 36
export default function Logo({ size = 36 }: LogoProps) {
	return (
		<div className="shrink-0 flex items-center justify-center">
			<svg
				width={size}
				height={size}
				viewBox="0 0 24 24"
				fill="none"
				xmlns="http://www.w3.org/2000/svg"
				role="img"
				aria-labelledby="title desc"
			>
				<title id="title">Financial budget app logo</title>
				<desc id="desc">
					A financial budget app logo with a progress ring, ascending budget
					bars, and a check mark in front.
				</desc>

				<defs>
					<linearGradient
						id="accentLight"
						x1="142"
						y1="360"
						x2="378"
						y2="132"
						gradientUnits="userSpaceOnUse"
					>
						<stop stopColor="#34D399" />
						<stop offset="1" stopColor="#4bc3fc" />
					</linearGradient>

					<linearGradient
						id="barAccentLight"
						x1="180"
						y1="338"
						x2="336"
						y2="190"
						gradientUnits="userSpaceOnUse"
					>
						<stop stopColor="#dcfce7" />
						<stop offset="1" stopColor="#a7f3d0" />
					</linearGradient>
				</defs>

				{/* Scale original 512×512 artwork into the 24×24 viewBox */}
				<g transform="scale(0.046875)">
					{/* Arcs - Replaced gradient with solid #34D399 (Teal) */}
					<path
						d="M158 350C126 320 108 277 113 234C120 167 173 116 239 110"
						stroke="#34D399"
						strokeWidth="28"
						strokeLinecap="round"
					/>
					<path
						d="M270 111C331 117 381 162 395 221"
						stroke="#34D399"
						strokeWidth="28"
						strokeLinecap="round"
					/>

					{/* Bars - Replaced gradient with solid #a7f3d0 (Light Teal) */}
					<rect x="171" y="276" width="42" height="76" rx="21" fill="#a7f3d0" />
					<rect
						x="235"
						y="231"
						width="42"
						height="121"
						rx="21"
						fill="#a7f3d0"
					/>
					<rect
						x="299"
						y="183"
						width="42"
						height="169"
						rx="21"
						fill="#a7f3d0"
					/>

					{/* Checkmark in front */}
					<circle
						cx="382"
						cy="167"
						r="36"
						className="fill-white dark:fill-[#1c1c1c]"
						stroke="#34D399"
						strokeWidth="12"
					/>
					<path
						d="M365 168L377 180L399 155"
						stroke="#34D399"
						strokeWidth="12"
						strokeLinecap="round"
						strokeLinejoin="round"
					/>
				</g>
			</svg>
		</div>
	);
}
